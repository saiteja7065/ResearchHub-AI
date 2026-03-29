from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from utils.auth import get_current_user

try:
    from scholarly import scholarly
except ImportError:
    scholarly = None

router = APIRouter(
    prefix="/integrations",
    tags=["Integrations"]
)

class ScholarAuthorResponse(BaseModel):
    scholar_id: str
    name: str
    affiliation: Optional[str]
    interests: List[str]
    citedby: Optional[int]
    url_picture: Optional[str]

class ScholarPublicationResponse(BaseModel):
    title: str
    author: str
    pub_year: Optional[str]
    num_citations: int
    pub_url: Optional[str]

@router.get("/scholar/search", response_model=List[ScholarAuthorResponse])
def search_google_scholar_profile(name: str, user=Depends(get_current_user)):
    """
    Search Google Scholar for author profiles by name.
    """
    if not scholarly:
        raise HTTPException(status_code=500, detail="scholarly package not installed")
    
    try:
        search_query = scholarly.search_author(name)
        results = []
        for i in range(5): # Limit to top 5 hits
            try:
                author = next(search_query)
                results.append(ScholarAuthorResponse(
                    scholar_id=author.get('scholar_id', ''),
                    name=author.get('name', ''),
                    affiliation=author.get('affiliation', ''),
                    interests=author.get('interests', []),
                    citedby=author.get('citedby', 0),
                    url_picture=author.get('url_picture', '')
                ))
            except StopIteration:
                break
        return results
    except Exception as e:
        print(f"Google Scholar Error: {e}")
        # Typical 429 block or IP ban
        raise HTTPException(status_code=500, detail="Google Scholar rate limit exceeded or blocked. Try again later.")

@router.get("/scholar/author/{scholar_id}", response_model=List[ScholarPublicationResponse])
def sync_scholar_publications(scholar_id: str, limit: int = 10, user=Depends(get_current_user)):
    """
    Fetch the top N publications for a specific Google Scholar author ID.
    """
    if not scholarly:
        raise HTTPException(status_code=500, detail="scholarly package not installed")
        
    try:
        # We must use search_author_id
        author = scholarly.search_author_id(scholar_id)
        if not author:
            raise HTTPException(status_code=404, detail="Author not found")
            
        author = scholarly.fill(author, sections=['publications'])
        pubs = author.get('publications', [])
        
        parsed_pubs = []
        for idx, pub in enumerate(pubs):
            if idx >= limit:
                break
                
            entry = pub.get('bib', {})
            parsed_pubs.append(ScholarPublicationResponse(
                title=entry.get('title', 'Unknown Title'),
                author=entry.get('author', ''),
                pub_year=str(entry.get('pub_year', '')),
                num_citations=pub.get('num_citations', 0),
                pub_url=pub.get('pub_url', '')
            ))
            
        return parsed_pubs
    except Exception as e:
        print(f"Google Scholar Sync Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to sync publications. Scholar may be rate limiting.")
