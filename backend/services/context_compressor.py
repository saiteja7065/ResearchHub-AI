import re
from typing import List, Dict

class ContextCompressor:
    def __init__(self, min_similarity_score: float = 0.25, max_jaccard_similarity: float = 0.75, max_total_chars: int = 12000):
        self.min_similarity_score = min_similarity_score
        self.max_jaccard_similarity = max_jaccard_similarity
        self.max_total_chars = max_total_chars

    def _get_tokens(self, text: str) -> set:
        """Simple tokenizer that lowers case and splits on non-word characters."""
        return set(re.findall(r'\w+', text.lower()))

    def _jaccard_similarity(self, text1: str, text2: str) -> float:
        """Calculates token overlap ratio between two texts."""
        set1 = self._get_tokens(text1)
        set2 = self._get_tokens(text2)
        if not set1 or not set2:
            return 0.0
        intersection = set1.intersection(set2)
        union = set1.union(set2)
        return len(intersection) / len(union)

    def compress(self, retrieved_chunks: List[Dict]) -> List[str]:
        """
        Compresses a list of Qdrant point payloads (with 'text' and 'score').
        Returns a deduplicated, high-relevance list of context strings.
        
        Expected structure of retrieved_chunks:
        [{"text": "abcd", "score": 0.8}, ...]
        Chunks should be pre-sorted by score (descending) by Qdrant.
        """
        filtered_chunks = []
        
        for item in retrieved_chunks:
            # 1. Filter out low-relevance chunks
            score = item.get("score", 1.0)
            if score < self.min_similarity_score:
                continue
                
            text = item.get("text", "").strip()
            if not text:
                continue

            # 2. Filter out highly redundant chunks
            is_redundant = False
            for accepted_text in filtered_chunks:
                similarity = self._jaccard_similarity(text, accepted_text)
                if similarity > self.max_jaccard_similarity:
                    is_redundant = True
                    break
            
            if not is_redundant:
                filtered_chunks.append(text)

        # 3. Apply Hard Cap Trimming
        final_chunks = []
        current_chars = 0
        
        for text in filtered_chunks:
            # Roughly trim the chunk to a sensible size if the single chunk is massive
            if len(text) > 1500:
                text = text[:1500] + " ...[truncated]"
                
            if current_chars + len(text) <= self.max_total_chars:
                final_chunks.append(text)
                current_chars += len(text)
            else:
                # Add the last possible slice
                remaining = self.max_total_chars - current_chars
                if remaining > 100:
                    final_chunks.append(text[:remaining] + " ...[truncated]")
                break

        print(f"🗜️ [Context Compressor] Reduced {len(retrieved_chunks)} raw chunks down to {len(final_chunks)} dense chunks. Char count: {current_chars}/{self.max_total_chars}")
        return final_chunks

context_compressor = ContextCompressor()
