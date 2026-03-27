import os
from supabase import create_client, Client

from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

with open('migration_1.sql', 'r') as f:
    sql = f.read()

try:
    # Attempting to use the postgres extension to execute raw SQL.
    # If this fails, we will need to direct the user to run it in the Supabase SQL editor.
    response = supabase.rpc("exec_sql", {"query": sql}).execute()
    print("Success:", response)
except Exception as e:
    print("Error:", e)
    print("\n\nCould not execute raw SQL via REST client (Supabase REST API does not support raw DDL directly without a custom RPC function).")
    print("Please go to https://supabase.com/dashboard/project/_/sql/new and paste the contents of migration_1.sql")
