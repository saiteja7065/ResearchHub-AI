import os
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
from sentence_transformers import SentenceTransformer

class VectorDBService:
    def __init__(self):
        # Using memory natively for fast local development to prevent RocksDB file lock deadlocks
        self.qdrant = QdrantClient(":memory:")
        
        # Fast, lightweight embedding model perfect for semantic search MVPs
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.vector_size = 384 # Size for MiniLM-L6-v2

    def create_collection_if_not_exists(self, collection_name: str):
        collections_response = self.qdrant.get_collections()
        exists = any(col.name == collection_name for col in collections_response.collections)
        
        if not exists:
            self.qdrant.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE),
            )

    def embed_and_store(self, workspace_id: str, paper_id: str, elements: List[Dict[str, Any]]):
        """
        Takes parsed text elements, generates embeddings, and saves them to Qdrant.
        The collection name is the workspace_id to isolate data per workspace.
        """
        collection_name = f"workspace_{workspace_id.replace('-', '_')}"
        self.create_collection_if_not_exists(collection_name)

        # We only want to embed narrative text and titles, not empty stuff
        valid_elements = [el for el in elements if el.get("type") in ["NarrativeText", "Title"] and el.get("text")]
        
        if not valid_elements:
            return 0
            
        texts = [el["text"] for el in valid_elements]
        
        # Generate embeddings in batch
        embeddings = self.model.encode(texts)
        
        # Prepare Qdrant points (use proper UUIDs since Qdrant 1.7.0 strict validates them)
        import uuid
        
        points = []
        for i, (element, embedding) in enumerate(zip(valid_elements, embeddings)):
            point_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"{paper_id}_{i}"))
            points.append(
                PointStruct(
                    id=point_id,
                    vector=embedding.tolist(),
                    payload={
                        "paper_id": paper_id,
                        "workspace_id": workspace_id,
                        "text": element["text"],
                        "type": element["type"],
                        "page_number": element.get("page_number", 0)
                    }
                )
            )
            
        # Upload to Qdrant
        self.qdrant.upsert(
            collection_name=collection_name,
            points=points
        )
        
        return len(points)

vector_db = VectorDBService()
