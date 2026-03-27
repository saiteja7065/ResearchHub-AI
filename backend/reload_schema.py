import os
from supabase import create_client, Client

from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

try:
    response = supabase.rpc("exec_sql", {"query": "NOTIFY pgrst, 'reload schema';"}).execute()
    print("Success Reload Schema:", response)
except Exception as e:
    print("Error:", e)
    print("\nCould not execute reload schema via RPC.")
