import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL", "https://placeholder-url.supabase.co")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "placeholder-key")

supabase: Client = create_client(url, key)
