import os
from supabase import create_client, Client

from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

import sys

if len(sys.argv) < 2:
    print("Usage: python run_migration.py <migration_file.sql>")
    sys.exit(1)

file_path = sys.argv[1]
with open(file_path, 'r') as f:
    sql = f.read()

try:
    response = supabase.rpc("exec_sql", {"query": sql}).execute()
    print("Success:", response)
except Exception as e:
    print("Error:", e)
    print(f"\nCould not execute raw SQL via REST. Please paste the contents of {file_path} in the Supabase SQL editor.")
