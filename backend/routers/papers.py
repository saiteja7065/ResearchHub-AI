from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
import httpx
import xml.etree.ElementTree as ET
from utils.auth import get_current_user
from utils.supabase_client import supabase

router = APIRouter(prefix="/papers", tags=["papers"])


def parse_arxiv_results(xml_text: str) -> list:
    """Parse arXiv Atom XML response into unified paper format."""
    papers = []
    try:
        root = ET.fromstring(xml_text)
        ns = {
            'atom': 'http://www.w3.org/2005/Atom',
            'arxiv': 'http://arxiv.org/schemas/atom'
        }
        entries = root.findall('atom:entry', ns)
        for entry in entries:
            title_el = entry.find('atom:title', ns)
            summary_el = entry.find('atom:summary', ns)
            id_el = entry.find('atom:id', ns)
            published_el = entry.find('atom:published', ns)
            authors = [a.find('atom:name', ns).text for a in entry.findall('atom:author', ns) if a.find('atom:name', ns) is not None]

            papers.append({
                "source": "arXiv",
                "external_id": id_el.text.split("/abs/")[-1] if id_el is not None else "",
                "title": (title_el.text or "").strip().replace("\n", " "),
                "authors": authors[:5],
                "abstract": (summary_el.text or "").strip().replace("\n", " ")[:500],
                "published_date": (published_el.text or "")[:10],
                "url": id_el.text if id_el is not None else "",
            })
    except Exception as e:
        print(f"arXiv parse error: {e}")
    return papers


def parse_pubmed_ids(ids_xml: str) -> list:
    """Parse PubMed ID list response."""
    try:
        root = ET.fromstring(ids_xml)
        ids = [id_el.text for id_el in root.findall(".//Id") if id_el.text]
        return ids[:10]
    except Exception:
        return []


def parse_pubmed_details(details_xml: str) -> list:
    """Parse PubMed article details XML into unified format."""
    papers = []
    try:
        root = ET.fromstring(details_xml)
        articles = root.findall(".//PubmedArticle")
        for article in articles:
            pmid_el = article.find(".//PMID")
            title_el = article.find(".//ArticleTitle")
            abstract_el = article.find(".//AbstractText")
            year_el = article.find(".//PubDate/Year")
            authors_els = article.findall(".//Author")

            authors = []
            for a in authors_els[:5]:
                last = a.find("LastName")
                fore = a.find("ForeName")
                if last is not None:
                    name = last.text or ""
                    if fore is not None:
                        name = f"{fore.text} {name}"
                    authors.append(name)

            pmid = pmid_el.text if pmid_el is not None else ""
            papers.append({
                "source": "PubMed",
                "external_id": pmid,
                "title": (title_el.text or "").strip() if title_el is not None else "Untitled",
                "authors": authors,
                "abstract": (abstract_el.text or "").strip()[:500] if abstract_el is not None else "No abstract available.",
                "published_date": (year_el.text or "") if year_el is not None else "",
                "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
            })
    except Exception as e:
        print(f"PubMed parse error: {e}")
    return papers


async def _search_arxiv(client: httpx.AsyncClient, query: str, limit: int) -> list:
    results = []
    try:
        arxiv_url = "https://export.arxiv.org/api/query"
        params = {
            "search_query": f"all:{query}",
            "start": 0,
            "max_results": limit,
            "sortBy": "relevance",
            "sortOrder": "descending"
        }
        resp = await client.get(arxiv_url, params=params)
        if resp.status_code == 200:
            results.extend(parse_arxiv_results(resp.text))
        else:
            print(f"arXiv returned status {resp.status_code}")
    except Exception as e:
        print(f"arXiv search error: {e}")
    return results

async def _search_pubmed(client: httpx.AsyncClient, query: str, limit: int) -> list:
    results = []
    try:
        esearch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
        esearch_params = {
            "db": "pubmed",
            "term": query,
            "retmax": limit,
            "retmode": "xml",
            "sort": "relevance",
            "tool": "ResearchHubAI",
            "email": "researchhub@ai.com"
        }
        id_resp = await client.get(esearch_url, params=esearch_params)
        if id_resp.status_code == 200:
            ids = parse_pubmed_ids(id_resp.text)
            if ids:
                efetch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
                efetch_params = {
                    "db": "pubmed",
                    "id": ",".join(ids),
                    "retmode": "xml",
                    "rettype": "abstract",
                    "tool": "ResearchHubAI",
                    "email": "researchhub@ai.com"
                }
                detail_resp = await client.get(efetch_url, params=efetch_params)
                if detail_resp.status_code == 200:
                    results.extend(parse_pubmed_details(detail_resp.text))
    except Exception as e:
        print(f"PubMed search error: {e}")
    return results

async def _search_semantic(client: httpx.AsyncClient, query: str, limit: int) -> list:
    results = []
    try:
        s2_url = "https://api.semanticscholar.org/graph/v1/paper/search"
        s2_params = {
            "query": query,
            "limit": limit,
            "fields": "title,authors,abstract,year,url,externalIds"
        }
        s2_resp = await client.get(s2_url, params=s2_params)
        if s2_resp.status_code == 200:
            data = s2_resp.json()
            for item in data.get("data", []):
                authors = [a.get("name") for a in item.get("authors", []) if a.get("name")][:5]
                paper_url = item.get("url")
                
                results.append({
                    "source": "Semantic Scholar",
                    "external_id": item.get("paperId", ""),
                    "title": item.get("title", "").strip() or "Untitled",
                    "authors": authors,
                    "abstract": (item.get("abstract") or "").strip()[:500] if item.get("abstract") else "No abstract available.",
                    "published_date": str(item.get("year", "")),
                    "url": paper_url if paper_url else f"https://www.semanticscholar.org/paper/{item.get('paperId')}",
                })
        else:
            print(f"Semantic Scholar returned status {s2_resp.status_code}")
    except Exception as e:
        print(f"Semantic Scholar search error: {e}")
    return results

@router.get("/search")
async def search_papers(
    query: str = Query(..., min_length=2),
    source: Optional[str] = Query("all", description="arxiv | pubmed | semantic_scholar | all"),
    limit: int = Query(10, le=20),
    user=Depends(get_current_user)
):
    """
    Search academic papers from arXiv, PubMed, Semantic Scholar, or all.
    Runs queries concurrently for dramatically lower latency.
    """
    import asyncio
    
    results = []
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}) as client:
        
        tasks = []
        if source in ("arxiv", "all"):
            tasks.append(_search_arxiv(client, query, limit))
        if source in ("pubmed", "all"):
            tasks.append(_search_pubmed(client, query, limit))
        if source in ("semantic_scholar", "all"):
            tasks.append(_search_semantic(client, query, limit))
            
        # Execute all API queries concurrently
        completed_tasks = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Merge results
        for task_result in completed_tasks:
            if isinstance(task_result, Exception):
                print(f"Concurrent execution caught exception: {task_result}")
            elif isinstance(task_result, list):
                results.extend(task_result)

    return {"results": results, "total": len(results), "query": query, "source": source}


@router.post("/import")
async def import_paper(paper: dict, user=Depends(get_current_user)):
    """
    Import a paper discovered via search into the user's account.
    Saves metadata to Supabase `papers` table.
    The paper dict must include: workspace_id, title, authors, abstract, url, source, external_id, published_date
    """
    workspace_id = paper.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="workspace_id is required")

    # Verify workspace belongs to user
    ws = supabase.table("workspaces").select("id").eq("id", workspace_id).eq("user_id", user.id).execute()
    if not ws.data:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Check if already imported
    existing = supabase.table("papers").select("id").eq("workspace_id", workspace_id).eq("original_filename", paper.get("external_id", "")).execute()
    if existing.data:
        return {"message": "Paper already imported", "paper": existing.data[0]}

    try:
        response = supabase.table("papers").insert({
            "workspace_id": workspace_id,
            "user_id": user.id,
            "title": paper.get("title", "Untitled"),
            "original_filename": paper.get("external_id", ""),
            "metadata": {
                "authors": paper.get("authors", []),
                "abstract": paper.get("abstract", ""),
                "url": paper.get("url", ""),
                "source": paper.get("source", ""),
                "published_date": paper.get("published_date", ""),
                "imported_from_search": True
            }
        }).execute()

        imported_paper = response.data[0]

        # ── Index into Qdrant for AI Agent RAG ──────────────────────
        try:
            from services.vector_db import vector_db

            title = paper.get("title", "")
            abstract = paper.get("abstract", "")
            authors = ", ".join(paper.get("authors", []))

            # Build synthetic text elements from metadata
            elements = []
            if title:
                elements.append({"type": "Title", "text": title, "page_number": 0})
            if authors:
                elements.append({"type": "NarrativeText", "text": f"Authors: {authors}", "page_number": 0})
            if abstract:
                elements.append({"type": "NarrativeText", "text": abstract, "page_number": 0})

            if elements:
                vector_db.embed_and_store(
                    workspace_id=workspace_id,
                    paper_id=imported_paper["id"],
                    elements=elements
                )
        except Exception as idx_err:
            print(f"⚠️ Qdrant indexing for imported paper failed (non-fatal): {idx_err}")

        return {"message": "Paper imported successfully", "paper": imported_paper}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


# ── AI Tools Endpoints ───────────────────────────────────────────────────────

from groq import Groq
import os
from pydantic import BaseModel
import traceback
from dotenv import load_dotenv

load_dotenv()

_groq_client = None

def get_groq():
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    return _groq_client


def _fetch_papers_context(paper_ids: list, user_id: str) -> list:
    """Fetch paper title + abstract from Supabase for the given IDs."""
    papers_data = []
    for pid in paper_ids:
        row = supabase.table("papers").select(
            "id, title, metadata"
        ).eq("id", pid).execute()
        if row.data:
            p = row.data[0]
            meta = p.get("metadata") or {}
            abstract = meta.get("abstract", "")
            # fallback: try to get text from uploaded elements
            if not abstract and "elements" in meta and isinstance(meta["elements"], list):
                texts = [e.get("text", "") for e in meta["elements"][:20] if isinstance(e, dict) and e.get("text")]
                abstract = " ".join(texts)[:1000]
            papers_data.append({
                "id": p["id"],
                "title": p["title"],
                "abstract": abstract[:800],
                "authors": meta.get("authors", []),
            })
    return papers_data


class AIToolsRequest(BaseModel):
    paper_ids: list
    workspace_id: str


def _call_groq(system_prompt: str, user_prompt: str) -> str:
    groq = get_groq()
    resp = groq.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.4,
        max_tokens=2048,
    )
    return resp.choices[0].message.content


@router.post("/ai-tools/summaries")
async def generate_summaries(req: AIToolsRequest, user=Depends(get_current_user)):
    """Generate concise AI summaries for selected papers."""
    try:
        papers = _fetch_papers_context(req.paper_ids, user.id)
        if not papers:
            raise HTTPException(status_code=404, detail="No papers found.")

        context = "\n\n".join([
            f"**{p['title']}**\nAuthors: {', '.join(p['authors']) if p.get('authors') else 'N/A'}\n{p['abstract']}"
            for p in papers
        ])

        result = _call_groq(
            system_prompt="You are an expert research analyst. Generate concise, structured summaries of research papers.",
            user_prompt=f"Generate a clear and concise summary for each of the following research papers in 5-7 bullet points each:\n\n{context}"
        )
        return {"result": result, "papers": [p["title"] for p in papers]}
    except HTTPException:
        raise
    except Exception as e:
        error_trace = traceback.format_exc()
        print("AI TOOLS ERROR:\n", error_trace)
        with open("error_ai_tools.log", "w") as f:
            f.write(error_trace)
        raise HTTPException(status_code=500, detail=f"AI Summaries Error: {str(e)}\n\nTraceback:\n{error_trace}")



@router.post("/ai-tools/insights")
async def extract_insights(req: AIToolsRequest, user=Depends(get_current_user)):
    """Extract key insights and trends from selected papers."""
    try:
        papers = _fetch_papers_context(req.paper_ids, user.id)
        if not papers:
            raise HTTPException(status_code=404, detail="No papers found.")

        context = "\n\n".join([
            f"**{p['title']}**\n{p['abstract']}"
            for p in papers
        ])

        result = _call_groq(
            system_prompt="You are an expert research analyst specializing in cross-paper insight extraction and trend analysis.",
            user_prompt=f"After analyzing the following research papers, extract:\n1. **Key Insights** (3-5 bullet points)\n2. **Common Trends** (2-3 bullet points)\n3. **Notable Findings** per paper\n4. **Research Implications**\n\nPapers:\n{context}"
        )
        return {"result": result, "papers": [p["title"] for p in papers]}
    except HTTPException:
        raise
    except Exception as e:
        error_trace = traceback.format_exc()
        print("AI TOOLS ERROR:\n", error_trace)
        raise HTTPException(status_code=500, detail=f"AI Insights Error: {str(e)}\n\nTraceback:\n{error_trace}")


@router.post("/ai-tools/literature-review")
async def generate_literature_review(req: AIToolsRequest, user=Depends(get_current_user)):
    """Generate a comprehensive literature review from selected papers."""
    try:
        papers = _fetch_papers_context(req.paper_ids, user.id)
        if not papers:
            raise HTTPException(status_code=404, detail="No papers found.")

        context = "\n\n".join([
            f"**{p['title']}**\nAuthors: {', '.join(p['authors']) if p.get('authors') else 'N/A'}\n{p['abstract']}"
            for p in papers
        ])

        result = _call_groq(
            system_prompt="You are an expert academic writer. Generate comprehensive, well-structured literature reviews in academic style with markdown formatting.",
            user_prompt=f"""Generate a comprehensive literature review from the following papers.
Structure it as:
## 1. Overview
## 2. Key Findings
## 3. Comparative Analysis
## 4. Research Gaps & Future Directions
## 5. Conclusion

Papers:
{context}"""
        )
        return {"result": result, "papers": [p["title"] for p in papers]}
    except HTTPException:
        raise
    except Exception as e:
        error_trace = traceback.format_exc()
        print("AI TOOLS ERROR:\n", error_trace)
        raise HTTPException(status_code=500, detail=f"AI Literature Review Error: {str(e)}\n\nTraceback:\n{error_trace}")


@router.delete("/{paper_id}")
async def delete_paper(paper_id: str, user=Depends(get_current_user)):
    """Delete a paper from the database for the authenticated user."""
    try:
        # Check if paper belongs to user
        verify = supabase.table("papers").select("id").eq("id", paper_id).eq("user_id", user.id).execute()
        if not verify.data:
            raise HTTPException(status_code=404, detail="Paper not found or unauthorized")

        # Delete it
        res = supabase.table("papers").delete().eq("id", paper_id).eq("user_id", user.id).execute()
        return {"message": "Paper deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete paper: {str(e)}")


