from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import json
import requests
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import CountVectorizer
import psycopg2
from psycopg2.extras import RealDictCursor
import re
import io
from pypdf import PdfReader
from groq import Groq

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN") or os.getenv("github_token")
DATABASE_URL = os.getenv("DATABASE_URL")

# Configure Groq
groq_client = Groq(api_key=GROQ_API_KEY)
# We use llama-3.3-70b-versatile for fast, high quality JSON inference
GROQ_MODEL = "llama-3.3-70b-versatile"

# Load Local Embedding Model
print("Loading Sentence Transformer Model...")
local_model = SentenceTransformer("all-MiniLM-L6-v2")
print("Model Loaded.")

# Semantic Cache for Gemini
response_cache = {}

# --- DATABASE SETUP ---
def init_db():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS candidates (
                id SERIAL PRIMARY KEY,
                name TEXT,
                headline TEXT,
                location TEXT,
                skills TEXT,
                ats_score REAL,
                job_role TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        conn.close()
        print("Database initialized.")
    except Exception as e:
        print(f"Database Error: {e}")

init_db()

# --- HELPER FUNCTIONS ---

def extract_text_from_pdf(file_stream):
    """
    Extracts text from a PDF file stream using pypdf.
    """
    try:
        reader = PdfReader(file_stream)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"PDF Extraction Error: {e}")
        return ""

def extract_candidate_details_with_groq(text):
    """
    Uses Groq to extract structured candidate details from resume text.
    Replaced Gemini due to API quota limits.
    """
    prompt = f"""
    Extract the following details from the resume text below:
    1. Name
    2. Headline (Current Role/Title)
    3. Location
    4. Skills (List of technical and soft skills)

    Resume Text:
    {text[:4000]}  # Limit text length for token limits

    You must return ONLY strictly valid JSON. Do NOT include markdown blocks like ```json.
    Ensure keys and string values are in double quotes.
    If you cannot find a certain detail, leave it as an empty string "" or empty array [].
    Do NOT use placeholder text like "Candidate Name" or "Current Job Title".

    Expected Format:
    {{
        "name": "extracted actual name from the text",
        "headline": "extracted actual job title from the text",
        "location": "extracted actual location from the text",
        "skills": ["extracted actual skill 1", "extracted actual skill 2"]
    }}
    """
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a specialized API that only outputs raw, valid JSON. Never include markdown formatting or conversational text."
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=GROQ_MODEL,
            temperature=0.1, # Low temperature for more deterministic extraction
            max_tokens=800,
            response_format={"type": "json_object"}
        )
        
        response_text = chat_completion.choices[0].message.content
        return json.loads(response_text)
    except Exception as e:
        print(f"Groq Extraction Error: {e}")
        return {
            "name": "Candidate",
            "headline": "Professional",
            "location": "Unknown",
            "skills": []
        }

def extract_meaningful_skills(text, top_n=10):
    """
    Extracts 1-3 word phrases (n-grams) from text to identify skills,
    avoiding single-word splitting of terms like "Machine Learning".
    """
    try:
        # Use CountVectorizer to find frequent n-grams (1-3 words)
        # stop_words='english' removes common filler words
        vectorizer = CountVectorizer(ngram_range=(1, 3), stop_words='english')
        X = vectorizer.fit_transform([text])
        feature_names = vectorizer.get_feature_names_out()
        return set(feature_names)
    except ValueError:
        # Handle empty text or no tokens found
        return set()

def calculate_ats_score(resume_text, job_description, input_skills):
    """
    Computes ATS score using Cosine Similarity.
    Identifies missing skills using N-Gram extraction.
    """
    # 1. Embeddings for Score
    # Combine resume text with explicit skills for better context
    augmented_resume = f"{resume_text} {' '.join(input_skills)}"
    
    embeddings = local_model.encode([augmented_resume, job_description])
    score = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0] * 100
    
    # 2. Advanced Skill Extraction (N-Grams)
    # Extract phrases from JD
    jd_phrases = extract_meaningful_skills(job_description)
    resume_phrases = extract_meaningful_skills(augmented_resume)
    
    # Find phrases in JD that are NOT in Resume
    missing_phrases = jd_phrases - resume_phrases
    
    # Filter logic: Prefer longer phrases if they are subsets of each other?
    # For simplicity, we just take the top distinct ones.
    # We remove very short or generic words if needed, but 'english' stop_words handles most.
    
    sorted_missing = sorted(list(missing_phrases), key=len, reverse=True)[:5]
    
    return round(float(score), 2), sorted_missing

def analyze_gap_with_groq(resume_text, job_description, job_role):
    """
    Uses Groq (Llama 3) to identify missing skills and generate a roadmap based on the gap.
    Groq is used here because it is incredibly fast at generating JSON responses.
    """
    cache_key = f"{job_role}-{hash(job_description)}"
    if cache_key in response_cache:
        return response_cache[cache_key]

    prompt = f"""
    Role: Senior Career Coach & Technical Recruiter.
    
    Task: Analyze the gap between a Candidate's Resume and a Job Description.
    
    Candidate Resume:
    {resume_text[:3000]}
    
    Job Description:
    {job_description[:3000]}
    
    Target Role: {job_role}

    Identify the key MISSING skills (Technical & Soft) that the candidate needs to learn to be a top candidate for this specific JD. 
    Ignore skills the candidate already has.
    
    Then, create a personalized learning plan to bridge these gaps.

    You must return ONLY strictly valid JSON. Do NOT include markdown blocks like ```json.
    Ensure keys and string values are in double quotes.
    
    Expected Format:
    {{
      "missing_skills": ["Skill1", "Skill2", "Skill3"], 
      "roadmap": [
        {{"skill": "Focus Area from Missing Skills", "duration": "e.g., 2 Weeks", "topic": "Actionable learning objective"}}
      ],
      "course_topics": ["Specific search query for Skill1", "Specific search query for Skill2", "Specific search query for Skill3", "Specific search query for Skill4"],
      "projects": [
        {{"name": "Project Name", "description": "What to build to demonstrate the missing skills", "stars": 0, "url": ""}} 
      ]
    }}
    """
    
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a specialized API that only outputs raw, valid JSON. Never include markdown formatting or conversational text."
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=GROQ_MODEL,
            temperature=0.7,
            max_tokens=1500,
            response_format={"type": "json_object"}
        )
        
        response_text = chat_completion.choices[0].message.content
        data = json.loads(response_text)
        response_cache[cache_key] = data
        return data
        
    except Exception as e:
        print(f"Groq Gap Analysis Error: {e}")
        # Return fallback structure
        return {
            "missing_skills": ["Skill Analysis Temporarily Unavailable"],
            "roadmap": [],
            "course_topics": [job_role], 
            "projects": []
        }

def fetch_coursera_courses(topic):
    """
    Returns a dynamically generated Coursera search link for the topic.
    This avoids the RapidAPI duplicate issue since the API does not support keyword search.
    """
    # Clean the topic string for URL formatting
    clean_topic = topic.replace(" ", "%20")
    
    return {
        "title": f"Complete {topic} Bootcamp",
        "platform": "Coursera",
        "rating": 4.8,
        "url": f"https://www.coursera.org/search?query={clean_topic}"
    }

def fallback_youtube_link(topic):
    return {
        "title": f"Learn {topic} on YouTube",
        "platform": "YouTube",
        "rating": 4.8,
        "url": f"https://www.youtube.com/results?search_query={topic}"
    }

def fetch_github_projects(keyword):
    """
    Search GitHub for repositories matching the keyword.
    """
    url = f"https://api.github.com/search/repositories?q={keyword}&sort=stars&order=desc"
    headers = {"Accept": "application/vnd.github.v3+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"
    
    try:
        response = requests.get(url, headers=headers)
        data = response.json()
        items = data.get("items", [])
        if items:
            repo = items[0]
            return {
                "name": repo["name"],
                "stars": repo["stargazers_count"],
                "url": repo["html_url"],
                "description": repo["description"]
            }
    except Exception as e:
        print(f"GitHub API Error for '{keyword}': {e}")
        
    return {
        "name": f"{keyword} Project Idea",
        "stars": 0,
        "url": f"https://github.com/search?q={keyword}",
        "description": f"Explore open source projects related to {keyword} on GitHub."
    }

@app.route("/analyze-seeker", methods=["POST"])
def analyze_seeker():
    # Detect if we have a file upload (multipart/form-data)
    resume_text = ""
    candidate_details = {}
    
    # 1. Handle Input Data
    if 'resume' in request.files:
        # Case A: PDF Upload
        file = request.files['resume']
        job_role = request.form.get("job_role", "Job Role")
        job_description = request.form.get("job_description", "")
        
        # Read PDF content
        resume_text = extract_text_from_pdf(file)
        print(f"[DEBUG] Extracted PDF Text Length: {len(resume_text)} characters")
        if len(resume_text) < 50:
            print(f"[DEBUG] Warning: Extracted text is very short! Content: {resume_text}")
        
        # Extract structured details from PDF via Groq
        candidate_details = extract_candidate_details_with_groq(resume_text)
        print(f"[DEBUG] Candidate Details from Groq: {candidate_details}")
        
    elif request.is_json:
        # Case B: Extension JSON Data
        data = request.json
        job_role = data.get("job_role", "Job Role")
        job_description = data.get("job_description", "")
        # The frontend sends "extensionData" (camelCase) instead of "extension_data"
        ext_data = data.get("extensionData", data.get("extension_data", {}))
        print(f"[DEBUG] Extension Data received: {ext_data}")
        
        candidate_details = {
            "name": ext_data.get("name", "Candidate"),
            "headline": ext_data.get("headline", ""),
            "location": ext_data.get("location", ""),
            "skills": ext_data.get("skills", []),
            "picture": ext_data.get("picture", None)
        }
        
        # Construct resume text from extension data for ATS scoring
        resume_text = f"{candidate_details['headline']} \n {', '.join(candidate_details['skills'])}"
    else:
        return jsonify({"error": "Invalid request format"}), 400

    # 2. ATS Scoring (Numeric Only) - Keep Cosine Similarity for the score
    ats_score, _ = calculate_ats_score(
        resume_text, 
        job_description, 
        candidate_details.get("skills", [])
    )
    
    # 3. AI Gap Analysis & Roadmap (Groq)
    # This REPLACES the Gemini implementation for speedier JSON generation
    ai_data = analyze_gap_with_groq(resume_text, job_description, job_role)
    
    missing_skills = ai_data.get("missing_skills", [])
    roadmap = ai_data.get("roadmap", [])
    course_topics = ai_data.get("course_topics", [])
    project_ideas = ai_data.get("projects", [])
    
    # 4. External API Fetching (Courses & Projects)
    final_courses = []
    for topic in course_topics[:4]: 
        final_courses.append(fetch_coursera_courses(topic))
        
    final_projects = []
    for proj in project_ideas:
        # Hybrid Search: Use AI project name + 'source code' for better results
        keyword = f"{proj.get('name')} {job_role}"
        repo_data = fetch_github_projects(keyword)
        
        # If GitHub search fails or returns generic, keep the AI description
        if "Project Idea" in repo_data["name"]:
            repo_data["description"] = proj.get("description")
            repo_data["name"] = proj.get("name")
            
        final_projects.append(repo_data)

    response = {
        "candidate": candidate_details,
        "ats_score": ats_score,
        "missing_skills": missing_skills,
        "roadmap": roadmap,
        "courses": final_courses,
        "projects": final_projects
    }
    
    return jsonify(response)

@app.route("/get-job-roles", methods=["GET"])
def get_job_roles():
    conn = psycopg2.connect(DATABASE_URL)
    c = conn.cursor()
    c.execute("SELECT DISTINCT job_role FROM candidates WHERE job_role IS NOT NULL AND job_role != ''")
    rows = c.fetchall()
    conn.close()
    return jsonify({"roles": [r[0] for r in rows]})

@app.route("/analyze-recruiter", methods=["POST"])
def analyze_recruiter():
    data = request.json
    
    candidates = data.get("candidates", [])
    job_role = data.get("job_role", "")
    job_description = data.get("job_description", "")
    
    conn = psycopg2.connect(DATABASE_URL)
    c = conn.cursor(cursor_factory=RealDictCursor)
    
    # Deduplicate incoming candidates by name to prevent cart duplicates
    unique_candidates = []
    seen_names = set()
    for cand in candidates:
        name = cand.get("name", "Unknown")
        if name not in seen_names:
            seen_names.add(name)
            unique_candidates.append(cand)
    
    # Process new candidates
    for cand in unique_candidates:
        name = cand.get("name", "Unknown")
        
        # Check if candidate already exists in DB for this role
        c.execute("SELECT id FROM candidates WHERE name = %s AND job_role = %s", (name, job_role))
        if c.fetchone():
            continue # Skip inserting if they already exist
            
        skills = cand.get("skills", [])
        headline = cand.get("headline", "")
        location = cand.get("location", "Unknown")
        
        # Combined text for embedding
        profile_text = f"{headline} {' '.join(skills)}"
        
        # Local calculation
        ats_score, _ = calculate_ats_score(profile_text, job_description, skills)
        
        # Insert into DB (Postgres uses %s for parameters)
        c.execute('''
            INSERT INTO candidates (name, headline, location, skills, ats_score, job_role)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (name, headline, location, json.dumps(skills), ats_score, job_role))
    
    conn.commit()
    
    # Fetch Top candidates for this role (Global Ranking) with Deduplication
    c.execute('''
        SELECT name, headline, location, skills, ats_score
        FROM (
            SELECT DISTINCT ON (name) name, headline, location, skills, ats_score 
            FROM candidates 
            WHERE job_role = %s 
            ORDER BY name, ats_score DESC
        ) as unique_candidates
        ORDER BY ats_score DESC
    ''', (job_role,))
    
    rows = c.fetchall()
    conn.close()
    
    ranked_candidates = []
    for r in rows:
        # Postgres returns RealDictRow if using RealDictCursor, which makes it easy to access by column name
        ranked_candidates.append({
            "name": r["name"],
            "headline": r["headline"],
            "location": r["location"],
            "skills": json.loads(r["skills"]) if isinstance(r["skills"], str) else r["skills"],
            "ats_score": r["ats_score"]
        })
    
    return jsonify({
        "ranked_candidates": ranked_candidates,
        "top_5": ranked_candidates[:5]
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)

