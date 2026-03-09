import asyncio
from services.vector_db import vector_db

async def debug_qdrant():
    print("--- Qdrant Debug ---")
    collections = vector_db.qdrant.get_collections()
    print("Collections:", [c.name for c in collections.collections])
    
    for c in collections.collections:
        print(f"\\nFetching 1 point from {c.name}:")
        try:
            points, next_page_offset = vector_db.qdrant.scroll(
                collection_name=c.name,
                limit=1,
                with_payload=True
            )
            for p in points:
                print(f"Payload keys: {list(p.payload.keys()) if p.payload else 'None'}")
                print(f"Payload: {p.payload}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_qdrant())
