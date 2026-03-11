import httpx
import asyncio

async def test_search():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    async with httpx.AsyncClient(headers=headers) as client:
        print("Testing Semantic Scholar with Browser User-Agent")
        s2_url = "https://api.semanticscholar.org/graph/v1/paper/search"
        s2_params = {
            "query": "Coffee Beans",
            "limit": 10,
            "fields": "title,authors,abstract,year,url,externalIds"
        }
        res = await client.get(s2_url, params=s2_params)
        print(res.status_code)
        print(len(res.json().get("data", [])))

asyncio.run(test_search())
