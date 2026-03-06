import requests
import json

base_url = "http://127.0.0.1:5000"

def test_proxy():
    print("Testing Image Proxy...")
    # Use a safe public image URL
    test_url = "https://ui-avatars.com/api/?name=Test+Candidate"
    
    try:
        res = requests.get(f"{base_url}/proxy-image", params={"url": test_url})
        if res.status_code == 200 and "data_url" in res.json():
            print("SUCCESS! Proxy returned:", res.json()["data_url"][:50] + "...")
        else:
            print("FAILED! Proxy returned:", res.text)
    except Exception as e:
        print("FAILED to connect to proxy:", e)

def test_recruiter_analyze():
    print("\nTesting Analyze Recruiter...")
    
    payload = {
        "job_role": "Backend Engineer",
        "job_description": "Looking for a Python developer with SQL and Postgres experience.",
        "candidates": [
            {
                "name": "Alex Applicant 😊", # includes emoji
                "headline": "Software Engineer | Python 👨‍💻", # includes emoji
                "location": "Boston, MA",
                "skills": ["Python", "SQL", "Flask", "PostgreSQL"],
                "linkedin_url": "https://www.linkedin.com/in/alex-applicant/",
                "picture": "https://ui-avatars.com/api/?name=Alex+Applicant"
            }
        ]
    }
    
    try:
        res = requests.post(f"{base_url}/analyze-recruiter", json=payload)
        data = res.json()
        
        candidates = data.get("ranked_candidates", [])
        if candidates and len(candidates) > 0:
            c = candidates[0]
            print(f"SUCCESS! Fetched {len(candidates)} candidates.")
            print(f"Name: {c.get('name')}")
            print(f"Skills: {c.get('skills')}")
            print(f"LinkedIn URL: {c.get('linkedin_url')}")
            print(f"Summary generated: {c.get('summary')}")
        else:
            print("FAILED! No candidates returned. Data:", data)
    except Exception as e:
        print("FAILED to analyze:", e)

if __name__ == "__main__":
    test_proxy()
    test_recruiter_analyze()
