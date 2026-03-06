import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def test_analyze_seeker():
    print("\n--- Testing /analyze-seeker ---")
    payload = {
        "name": "Test User",
        "headline": "Software Engineer | Python | React",
        "skills": ["Python", "React", "Flask"],
        "job_role": "Full Stack Developer",
        "job_description": "We are looking for a Full Stack Developer with experience in Python, React, Flask, and Docker. Knowledge of Kubernetes is a plus."
    }
    
    try:
        response = requests.post(f"{BASE_URL}/analyze-seeker", json=payload)
        response.raise_for_status()
        data = response.json()
        
        print("✅ Status Code:", response.status_code)
        print(f"✅ ATS Score: {data.get('ats_score')}")
        print(f"✅ Missing Skills: {data.get('missing_skills')}")
        print(f"✅ Roadmap Steps: {len(data.get('roadmap', []))}")
        print(f"✅ Courses: {len(data.get('courses', []))}")
        print(f"✅ Projects: {len(data.get('projects', []))}")
        
        # Verify structure
        if data.get('courses'):
            print(f"   Example Course: {data['courses'][0].get('title')} ({data['courses'][0].get('platform')})")
            
        if data.get('projects'):
             print(f"   Example Project: {data['projects'][0].get('name')} (Stars: {data['projects'][0].get('stars')})")

    except Exception as e:
        print("❌ Error:", e)
        if 'response' in locals():
            print("Response:", response.text)

def test_analyze_recruiter():
    print("\n--- Testing /analyze-recruiter ---")
    payload = {
        "job_role": "Data Scientist",
        "job_description": "Looking for a Data Scientist with Python, Pandas, and Scikit-Learn skills.",
        "candidates": [
            {"name": "Alice", "headline": "Data Scientist", "skills": ["Python", "Pandas", "Scikit-Learn"]},
            {"name": "Bob", "headline": "Java Developer", "skills": ["Java", "Spring"]},
            {"name": "Charlie", "headline": "Junior Data Analyst", "skills": ["Python", "Excel"]}
        ]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/analyze-recruiter", json=payload)
        response.raise_for_status()
        data = response.json()
        
        print("✅ Status Code:", response.status_code)
        print(f"✅ Ranked Candidates: {len(data.get('ranked_candidates', []))}")
        print(f"✅ Top Candidate: {data['ranked_candidates'][0]['name']} (Score: {data['ranked_candidates'][0]['ats_score']})")
        
        # Verify ordering
        scores = [c['ats_score'] for c in data['ranked_candidates']]
        if scores == sorted(scores, reverse=True):
            print("✅ Ranking matches expected order (Descending)")
        else:
            print("❌ Ranking order mismatch")

    except Exception as e:
        print("❌ Error:", e)

if __name__ == "__main__":
    test_analyze_seeker()
    test_analyze_recruiter()
