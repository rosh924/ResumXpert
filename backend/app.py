from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import json
import requests
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import CountVectorizer
import sqlite3
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
DATABASE_URL = "candidates.db"

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
        conn = sqlite3.connect(DATABASE_URL)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS candidates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                headline TEXT,
                location TEXT,
                skills TEXT,
                ats_score REAL,
                job_role TEXT,
                picture TEXT,
                summary TEXT,
                matched_skills TEXT,
                linkedin_url TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        
        # Add new columns if they don't exist
        # SQLite ALTER TABLE ADD COLUMN does not support IF NOT EXISTS directly.
        # We need to query table info first.
        c.execute("PRAGMA table_info(candidates)")
        columns = [col[1] for col in c.fetchall()]
        
        for col in ['picture', 'summary', 'missing_skills', 'matched_skills', 'linkedin_url']:
            if col not in columns:
                try:
                    c.execute(f"ALTER TABLE candidates ADD COLUMN {col} TEXT")
                    conn.commit()
                except Exception as e:
                    print(f"Column add error for {col}: {e}")
                
        conn.close()
        print("Database initialized locally with SQLite.")
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

def extract_skills_with_groq(text):
    """
    Uses Groq to extract a clean list of technical and soft skills from a text block.
    This replaces the noisy N-gram approach.
    """
    prompt = f"""
    Extract a clean list of technical and soft skills from the following text. 
    Only return a JSON list of strings representing the skills.
    Text: {text[:2000]}
    
    Expected Format:
    ["Skill 1", "Skill 2", "Skill 3"]
    """
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=GROQ_MODEL,
            temperature=0.1,
            response_format={"type": "json_object"} if "llama-3.1" in GROQ_MODEL or "llama-3.3" in GROQ_MODEL else None
        )
        content = chat_completion.choices[0].message.content
        # Ensure we get a list
        data = json.loads(content)
        if isinstance(data, dict):
            # If it wrapped it in a key, find the list
            for v in data.values():
                if isinstance(v, list): return v
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"Skill Extraction Error: {e}")
        return []


def calculate_ats_score(resume_text, job_description, input_skills, jd_skills=None):
    """
    Computes ATS score using Cosine Similarity.
    Identified missing skills using Groq-extracted precision skills.
    """
    sorted_skills = sorted([str(s).strip() for s in input_skills if s.strip()])
    clean_resume = " ".join(resume_text.split())
    clean_jd = " ".join(job_description.split())
    
    augmented_resume = f"{clean_resume} {' '.join(sorted_skills)}".strip()
    
    if len(clean_jd) < 20:
        return 0.0, [], []

    try:
        embeddings = local_model.encode([augmented_resume, clean_jd])
        raw_score = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0] * 100
        score = max(0, min(100, raw_score))
    except Exception as e:
        score = 0.0
    
    # Use provided jd_skills or extract them
    if jd_skills is None:
        jd_skills = set(extract_skills_with_groq(job_description))
    else:
        jd_skills = set(jd_skills)
        
    resume_skills = set(extract_skills_with_groq(augmented_resume))
    
    missing = list(jd_skills - resume_skills)
    matched = list(jd_skills.intersection(resume_skills))
    
    return round(float(score), 2), sorted(missing)[:12], sorted(matched)[:12]

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
    ats_score, _, _ = calculate_ats_score(
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
    conn = sqlite3.connect(DATABASE_URL)
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
    
    # Enable dict factory for sqlite3
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # Deduplicate incoming candidates by name to prevent cart duplicates
    unique_candidates = []
    seen_names = set()
    for cand in candidates:
        name = cand.get("name", "Unknown")
        if name not in seen_names:
            seen_names.add(name)
            unique_candidates.append(cand)
    
    # Process new candidates
    BAD_NAMES_EXACT = ["you might like", "(1) skills", "skills (1)", "career professional", "candidate", "unknown", "linkedin"]
    
    # Prerender JD skills for optimization
    jd_skills = extract_skills_with_groq(job_description)
    
    for cand in unique_candidates:
        name = cand.get("name", "Unknown")
        normalized_name = name.lower().strip()
        
        # Skip garbage candidates - use exact or more careful matching
        if normalized_name in BAD_NAMES_EXACT or len(normalized_name) < 3:
            continue
            
        skills = cand.get("skills", [])
        headline = cand.get("headline", "")
        location = cand.get("location", "Unknown")
        picture = cand.get("picture", "")
        linkedin_url = cand.get("linkedin_url", "").strip()
        
        # Combined text for embedding
        profile_text = f"{headline} \n {', '.join(skills)}"
        
        # Local calculation
        ats_score, missing_skills, matched_skills = calculate_ats_score(profile_text, job_description, skills)
        
        summary = f"{name} is an applicant for {job_role} with key skills in {', '.join(matched_skills[:3]) if matched_skills else 'their respective field'}."
        
        # Identity Mapping Logic
        existing_id = None
        
        if linkedin_url and "linkedin.com" in linkedin_url.lower():
             # 1. Try matching by URL first
             c.execute("SELECT id FROM candidates WHERE linkedin_url = ? AND job_role = ?", (linkedin_url, job_role))
             res = c.fetchone()
             if res:
                 existing_id = res['id']
             else:
                 # 2. If URL doesn't match, check if there's a same-name candidate WITHOUT a URL
                 c.execute("SELECT id, linkedin_url FROM candidates WHERE LOWER(TRIM(name)) = ? AND job_role = ?", (normalized_name, job_role))
                 res = c.fetchone()
                 if res and (not res['linkedin_url'] or res['linkedin_url'] == ""):
                     # Assume it's the same person who didn't have a URL before
                     existing_id = res['id']
        else:
             # 3. No URL provided, match by name only
             c.execute("SELECT id FROM candidates WHERE LOWER(TRIM(name)) = ? AND job_role = ?", (normalized_name, job_role))
             res = c.fetchone()
             if res:
                 existing_id = res['id']
        
        if existing_id:
            c.execute('''
                UPDATE candidates 
                SET name = ?, headline = ?, location = ?, skills = ?, ats_score = ?, picture = ?, summary = ?, missing_skills = ?, matched_skills = ?, linkedin_url = ?
                WHERE id = ?
            ''', (name, headline, location, json.dumps(skills), ats_score, picture, summary, json.dumps(missing_skills), json.dumps(matched_skills), linkedin_url, existing_id))
        else:
            c.execute('''
                INSERT INTO candidates (name, headline, location, skills, ats_score, job_role, picture, summary, missing_skills, matched_skills, linkedin_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (name, headline, location, json.dumps(skills), ats_score, job_role, picture, summary, json.dumps(missing_skills), json.dumps(matched_skills), linkedin_url))
    
    conn.commit()
    
    # Fetch ALL candidates for this role 
    c.execute('''
        SELECT id, name, headline, location, skills, ats_score, picture, summary, missing_skills, matched_skills, linkedin_url
        FROM candidates 
        WHERE job_role = ?
        ORDER BY ats_score DESC
    ''', (job_role,))
    
    rows = c.fetchall()
    conn.close()
    
    # Aggressively deduplicate in Python before sending to frontend
    ranked_candidates = []
    seen_final_names = set()
    
    for r in rows:
        r_dict = dict(r)
        name = r_dict.get("name", "")
        normalized = name.lower().strip()
        
        if normalized in seen_final_names or not normalized:
            continue
            
        seen_final_names.add(normalized)
        
        def safe_json_load(val):
            if not val: return []
            if not isinstance(val, str): return val
            try:
                return json.loads(val)
            except:
                return []

        ranked_candidates.append({
            "id": r_dict.get("id"),
            "name": r_dict.get("name", ""),
            "headline": r_dict.get("headline", ""),
            "location": r_dict.get("location", ""),
            "skills": safe_json_load(r_dict.get("skills")),
            "ats_score": r_dict.get("ats_score", 0),
            "picture": r_dict.get("picture", ""),
            "summary": r_dict.get("summary", ""),
            "missing_skills": safe_json_load(r_dict.get("missing_skills")),
            "matched_skills": safe_json_load(r_dict.get("matched_skills")),
            "linkedin_url": r_dict.get("linkedin_url", "")
        })
    
    return jsonify({
        "ranked_candidates": ranked_candidates,
        "top_5": ranked_candidates[:5]
    })

@app.route("/candidates", methods=["POST"])
def add_candidate():
    data = request.json
    name = data.get("name", "Unknown")
    headline = data.get("headline", "")
    location = data.get("location", "Unknown")
    skills = data.get("skills", [])
    job_role = data.get("job_role", "")
    picture = data.get("picture", "")
    linkedin_url = data.get("linkedin_url", "")
    
    # For manual entry, we start with 0 score. 
    # The recruiter can trigger a re-analysis by clicking 'Analyze' if they want.
    ats_score = 0.0
    summary = f"{name} is a manual entry for {job_role}."

    conn = sqlite3.connect(DATABASE_URL)
    c = conn.cursor()
    c.execute('''
        INSERT INTO candidates (name, headline, location, skills, ats_score, job_role, picture, summary, linkedin_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (name, headline, location, json.dumps(skills), ats_score, job_role, picture, summary, linkedin_url))
    conn.commit()
    new_id = c.lastrowid
    conn.close()
    
    return jsonify({"message": "Candidate added successfully", "id": new_id}), 201

@app.route("/candidates/<int:id>", methods=["PUT"])
def update_candidate(id):
    data = request.json
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    c.execute("SELECT * FROM candidates WHERE id = ?", (id,))
    candidate = c.fetchone()
    if not candidate:
        conn.close()
        return jsonify({"error": "Candidate not found"}), 404
    
    name = data.get("name", candidate["name"])
    headline = data.get("headline", candidate["headline"])
    location = data.get("location", candidate["location"])
    skills = data.get("skills", json.loads(candidate["skills"]) if candidate["skills"] else [])
    picture = data.get("picture", candidate["picture"])
    linkedin_url = data.get("linkedin_url", candidate["linkedin_url"])
    
    c.execute('''
        UPDATE candidates 
        SET name = ?, headline = ?, location = ?, skills = ?, picture = ?, linkedin_url = ?
        WHERE id = ?
    ''', (name, headline, location, json.dumps(skills), picture, linkedin_url, id))
    
    conn.commit()
    conn.close()
    return jsonify({"message": "Candidate updated successfully"})

@app.route("/candidates", methods=["GET"])
def get_candidates():
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM candidates ORDER BY timestamp DESC")
    rows = c.fetchall()
    conn.close()
    
    candidates = []
    for r in rows:
        r_dict = dict(r)
        candidates.append({
            "id": r_dict.get("id"),
            "name": r_dict.get("name"),
            "headline": r_dict.get("headline"),
            "location": r_dict.get("location"),
            "skills": json.loads(r_dict.get("skills")) if r_dict.get("skills") else [],
            "ats_score": r_dict.get("ats_score"),
            "job_role": r_dict.get("job_role"),
            "picture": r_dict.get("picture"),
            "linkedin_url": r_dict.get("linkedin_url")
        })
    return jsonify(candidates)

@app.route("/candidates/<int:id>", methods=["DELETE"])
def delete_candidate(id):
    conn = sqlite3.connect(DATABASE_URL)
    c = conn.cursor()
    c.execute("DELETE FROM candidates WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Candidate deleted successfully"})

import base64

@app.route("/proxy-image")
def proxy_image():
    """
    Downloads an image and returns it as a Base64 string to bypass CORS issues in the frontend PDF generator.
    """
    image_url = request.args.get('url')
    if not image_url:
        return jsonify({"error": "No URL provided"}), 400
        
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(image_url, headers=headers, stream=True, timeout=5)
        response.raise_for_status()
        
        # Convert response content to base64
        base64_encoded = base64.b64encode(response.content).decode('utf-8')
        content_type = response.headers.get('Content-Type', 'image/jpeg')
        
        # Determine format for data URL
        data_url = f"data:{content_type};base64,{base64_encoded}"
        return jsonify({"data_url": data_url})
    except Exception as e:
        print(f"Image Proxy Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)

