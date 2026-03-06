from tech_skills import TECH_SKILLS

def extract_skills(jd, user_skills):
    # Extract skills from JD based on predefined list
    extracted_skills = set()
    jd_lower = jd.lower()
    
    # Sort skills by length (descending) to prioritize longer phrases
    sorted_tech_skills = sorted(TECH_SKILLS, key=len, reverse=True)
    
    for skill in sorted_tech_skills:
        if skill in jd_lower:
            extracted_skills.add(skill)

    # Fallback if no skills found
    if not extracted_skills:
         words = set(jd_lower.split())
         extracted_skills = words.intersection(TECH_SKILLS)

    missing = list(extracted_skills - set(user_skills))[:5]
    return missing

# Test Cases
test_cases = [
    {
        "jd": "We are looking for a Full Stack Developer with experience in Python, React, and AWS.",
        "skills": [],
        "expected": ["full stack", "python", "react", "aws"] # Approx check
    },
    {
        "jd": "seeking a data scientist who knows machine learning and pandas.",
        "skills": ["python"],
        "expected": ["machine learning", "pandas", "data science"] # data science might not be explicitly in text but let's see
    },
     {
        "jd": "java developer needed.",
        "skills": ["c++"],
        "expected": ["java"]
    }
]

with open("test_results.txt", "w", encoding="utf-8") as f:
    f.write("Running Tests...\n\n")
    for i, case in enumerate(test_cases):
        f.write(f"Test Case {i+1}:\n")
        f.write(f"JD: {case['jd']}\n")
        f.write(f"User Skills: {case['skills']}\n")
        missing = extract_skills(case['jd'], case['skills'])
        f.write(f"Extracted Missing Skills: {missing}\n")
        f.write("-" * 30 + "\n")

    f.write("\nDone.\n")
