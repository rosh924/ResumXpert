import requests
import json

payload = {
    "job_role": "Data Scientist",
    "job_description": "We need Python and Cloud skills. Experience with machine learning models and data pipelines is a plus.",
    "extension_data": {
        "name": "John Doe",
        "headline": "Python Developer",
        "location": "New York",
        "skills": ["Python", "Flask", "React", "Machine Learning"]
    }
}
try:
    response = requests.post("http://localhost:5000/analyze-seeker", json=payload)
    print("STATUS:", response.status_code)
    try:
        print("RESPONSE:", json.dumps(response.json(), indent=2))
    except:
        print("RESPONSE TEXT:", response.text)
except Exception as e:
    print("ERROR:", e)
