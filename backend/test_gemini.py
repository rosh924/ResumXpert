import requests
import json

url = "http://127.0.0.1:5000/analyze"

payload = {
    "mode": "seeker",
    "name": "Jane Doe",
    "headline": "Junior Software Developer",
    "location": "New York, NY",
    "skills": ["Python", "JavaScript", "HTML", "CSS"],
    "job_role": "Full Stack Developer",
    "job_description": "We are looking for a Full Stack Developer with experience in React, Node.js, and Python. Knowledge of AWS is a plus."
}

try:
    print("Sending request to backend...")
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        print("\nSuccess! Response received:")
        data = response.json()
        print(json.dumps(data, indent=2))
    else:
        print(f"\nError: {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"\nException: {e}")
    print("Make sure the flask app is running!")
