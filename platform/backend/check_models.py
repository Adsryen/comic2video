import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("❌ Error: GOOGLE_API_KEY not found in environment.")
    exit(1)

genai.configure(api_key=api_key)

print(f"Checking models for API Key: {api_key[:5]}...{api_key[-4:]}")
print("--------------------------------------------------")

try:
    count = 0
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ FOUND: {m.name}")
            count += 1
    
    if count == 0:
        print("⚠ No 'generateContent' models found. Check your API Key permissions.")
    else:
        print(f"\n✔ Found {count} usable models.")

except Exception as e:
    print(f"❌ Error listing models: {e}")