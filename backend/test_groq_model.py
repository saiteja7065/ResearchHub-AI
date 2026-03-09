import asyncio
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

model = "llama-3.3-70b-versatile"
try:
    print(f"Testing Groq with {model}...")
    completion = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": "Say hello world"}],
        temperature=0.0,
        max_tokens=20,
    )
    print("Success:", completion.choices[0].message.content)
except Exception as e:
    print("Error:", e)
