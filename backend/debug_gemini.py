import os
from dotenv import load_dotenv
load_dotenv()
import google.generativeai as genai
import json
import re
import traceback

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
# In app.py the model is gemini-2.0-flash
gemini_model = genai.GenerativeModel("gemini-2.0-flash")

text = """
John Doe
Location: New York
Headline: Senior Software Engineer
Skills: Python, Java, Docker, AWS
Experience: 5 years building scalable backends
"""

prompt = f"""
Extract the following details from the resume text below:
1. Name
2. Headline (Current Role/Title)
3. Location
4. Skills (List of technical and soft skills)

Resume Text:
{text[:4000]}  # Limit text length for token limits

Return ONLY strictly valid JSON:
{{
    "name": "Candidate Name",
    "headline": "Current Job Title",
    "location": "City, Country",
    "skills": ["Skill1", "Skill2", ...]
}}
"""

try:
    print("Sending request to Gemini...")
    response = gemini_model.generate_content(prompt)
    print("RAW RESPONSE:")
    print(response.text)
    
    json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
    if json_match:
        cleaned_text = json_match.group(0)
        parsed = json.loads(cleaned_text)
        print("PARSED JSON:")
        print(json.dumps(parsed, indent=2))
    else:
        print("No JSON found in response.")
except Exception as e:
    print("FAILED EXCEPTION:")
    traceback.print_exc()
