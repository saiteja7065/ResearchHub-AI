import os
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct

current_dir = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.abspath(os.path.join(current_dir, "..", "model_cache"))

class ONNXEmbeddingModel:
    def __init__(self, model_dir: str):
        import onnxruntime as ort
        from tokenizers import Tokenizer
        
        onnx_path = os.path.join(model_dir, "onnx", "model.onnx")
        tokenizer_path = os.path.join(model_dir, "tokenizer.json")
        
        self.tokenizer = Tokenizer.from_file(tokenizer_path)
        self.tokenizer.enable_padding(pad_id=0, pad_token="[PAD]")
        self.tokenizer.enable_truncation(max_length=256)
        
        self.session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])

    def encode(self, sentences):
        import numpy as np
        
        is_single = isinstance(sentences, str)
        if is_single:
            sentences = [sentences]
            
        encodings = self.tokenizer.encode_batch(sentences)
        input_ids = np.array([e.ids for e in encodings], dtype=np.int64)
        attention_mask = np.array([e.attention_mask for e in encodings], dtype=np.int64)
        token_type_ids = np.array([e.type_ids for e in encodings], dtype=np.int64)
        
        outputs = self.session.run(None, {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "token_type_ids": token_type_ids
        })
        last_hidden_state = outputs[0]
        
        input_mask_expanded = np.expand_dims(attention_mask, -1).astype(float)
        sum_embeddings = np.sum(last_hidden_state * input_mask_expanded, axis=1)
        sum_mask = np.clip(input_mask_expanded.sum(axis=1), a_min=1e-9, a_max=None)
        pooled = sum_embeddings / sum_mask
        
        norms = np.linalg.norm(pooled, axis=1, keepdims=True)
        embeddings = pooled / norms
        
        if is_single:
            return embeddings[0]
        return embeddings

class VectorDBService:
    def __init__(self):
        # Using memory natively for fast local development to prevent RocksDB file lock deadlocks
        self.qdrant = QdrantClient(":memory:")
        self._model = None
        self.vector_size = 384 # Size for MiniLM-L6-v2

    @property
    def model(self):
        """Lazy-load the custom ONNX embedding model only when first accessed.
        This prevents ONNX Runtime from loading at import time, allowing the
        FastAPI server to bind to the port immediately on startup."""
        if self._model is None:
            print("[VectorDB] Loading custom ONNX Embedding model (all-MiniLM-L6-v2)...")
            self._model = ONNXEmbeddingModel(MODEL_DIR)
            print("[VectorDB] ONNX model loaded successfully.")
        return self._model

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

    def search(self, workspace_id: str, query: str, limit: int = 5, paper_ids: List[str] = None) -> List[Dict[str, Any]]:
        collection_name = f"workspace_{workspace_id.replace('-', '_')}"
        try:
            query_vector = self.model.encode(query).tolist()
            
            from qdrant_client.http.models import Filter, FieldCondition, MatchAny
            
            query_filter = None
            if paper_ids:
                query_filter = Filter(
                    must=[
                        FieldCondition(
                            key="paper_id",
                            match=MatchAny(any=paper_ids)
                        )
                    ]
                )
                
            search_result = self.qdrant.search(
                collection_name=collection_name,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=limit
            )
            return [hit.payload for hit in search_result]
        except Exception as e:
            print(f"Qdrant search failed: {e}")
            return []

vector_db = VectorDBService()
