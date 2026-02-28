import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from utils.supabase_client import supabase

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Validates the Supabase JWT token sent by the React frontend.
    Returns the user object if valid, throws 401 if invalid.
    """
    token = credentials.credentials
    
    # Verify the JWT token with Supabase
    response = supabase.auth.get_user(token)
    
    if not response.user:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return response.user
