import hashlib
import threading
import time
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from utils.supabase_client import supabase

security = HTTPBearer()

# Validating a JWT costs a network round-trip to Supabase. Every page fires several API calls,
# so validated tokens are cached briefly (well under the 1h JWT lifetime) to skip repeat lookups.
_TOKEN_TTL_SECONDS = 300
_MAX_CACHED_TOKENS = 1000
_token_cache = {}
_cache_lock = threading.Lock()


def _cache_get(key: str):
    with _cache_lock:
        entry = _token_cache.get(key)
        if entry and entry[0] > time.monotonic():
            return entry[1]
        _token_cache.pop(key, None)
        return None


def _cache_put(key: str, user):
    with _cache_lock:
        if len(_token_cache) >= _MAX_CACHED_TOKENS:
            now = time.monotonic()
            for k in [k for k, (exp, _) in _token_cache.items() if exp <= now]:
                del _token_cache[k]
            if len(_token_cache) >= _MAX_CACHED_TOKENS:
                _token_cache.clear()
        _token_cache[key] = (time.monotonic() + _TOKEN_TTL_SECONDS, user)


# Sync on purpose: FastAPI runs sync dependencies in a threadpool, so the blocking
# Supabase call no longer stalls the event loop for every other in-flight request.
def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Validates the Supabase JWT token sent by the React frontend.
    Returns the user object if valid, throws 401 if invalid.
    """
    token = credentials.credentials
    cache_key = hashlib.sha256(token.encode()).hexdigest()
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        # Verify the JWT token with Supabase
        response = supabase.auth.get_user(token)
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not response or not response.user:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    _cache_put(cache_key, response.user)
    return response.user
