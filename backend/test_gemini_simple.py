import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("GEMINI_API_KEY not found in .env")
else:
    genai.configure(api_key=api_key)
    # The app use gemini-2.0-flash, but I'll try 1.5 flash too just in case
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content("Hello, are you working?")
        print("1.5-flash Response:", response.text)
    except Exception as e:
        print("1.5-flash Error:", e)

    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content("Hello, are you working?")
        print("2.0-flash Response:", response.text)
    except Exception as e:
        print("2.0-flash Error:", e)
