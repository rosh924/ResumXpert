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
    with open("test_output.txt", "w") as f:
        f.write("Sending request to backend...\n")
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            f.write("\nSuccess! Response received:\n")
            data = response.json()
            f.write(json.dumps(data, indent=2))
        else:
            f.write(f"\nError: {response.status_code}\n")
            f.write(response.text)

except Exception as e:
    with open("test_output.txt", "a") as f:
        f.write(f"\nException: {e}\n")
