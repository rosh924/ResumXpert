import os
from dotenv import load_dotenv
load_dotenv()
from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY)

print("Listing models...")
models = groq_client.models.list()
for model in models.data:
    if "llama" in model.id.lower():
        print(model.id)
