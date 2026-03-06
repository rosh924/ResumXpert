import sys
import traceback
import json
from app import extract_candidate_details_with_groq

try:
    empty_resume = ""
    result = extract_candidate_details_with_groq(empty_resume)
    print("SUCCESS JSON:")
    print(json.dumps(result, indent=2))
except Exception as e:
    print("FAILED EXCEPTION:")
    traceback.print_exc()
