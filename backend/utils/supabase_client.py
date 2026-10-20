import os
import httpx
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL", "https://placeholder-url.supabase.co")
# Accept either name: the README historically documented SUPABASE_KEY
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY") or "placeholder-key"

# supabase-py keeps pooled keep-alive connections; after an idle period Supabase closes them and
# the next request fails with "Server disconnected". The request never reached the server, so
# retrying once on a fresh connection is safe and hides the error from users.
_original_send = httpx.Client.send


def _send_with_reconnect_retry(self, request, *args, **kwargs):
    try:
        return _original_send(self, request, *args, **kwargs)
    except (httpx.RemoteProtocolError, httpx.ConnectError):
        return _original_send(self, request, *args, **kwargs)


httpx.Client.send = _send_with_reconnect_retry

supabase: Client = create_client(url, key)
