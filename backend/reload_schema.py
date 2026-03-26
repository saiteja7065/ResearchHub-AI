import os
from supabase import create_client, Client

url = "https://ionrokdbxtnettdndyqt.supabase.co"
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvbnJva2RieHRuZXR0ZG5keXF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI4MDQyMCwiZXhwIjoyMDg3ODU2NDIwfQ.zup9STYglnUJlS67B2lGab1nlsvdeby_9mVWboYrDO4")
supabase: Client = create_client(url, key)

try:
    response = supabase.rpc("exec_sql", {"query": "NOTIFY pgrst, 'reload schema';"}).execute()
    print("Success Reload Schema:", response)
except Exception as e:
    print("Error:", e)
    print("\nCould not execute reload schema via RPC.")
