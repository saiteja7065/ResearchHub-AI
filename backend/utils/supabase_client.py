import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL", "https://placeholder-url.supabase.co")
# Accept either name: the README historically documented SUPABASE_KEY
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY") or "placeholder-key"

supabase: Client = create_client(url, key)
