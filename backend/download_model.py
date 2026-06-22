import os

# Force sentence-transformers to download model weights directly into the project folder
# This MUST be set before importing sentence_transformers
current_dir = os.path.dirname(os.path.abspath(__file__))
os.environ["SENTENCE_TRANSFORMERS_HOME"] = os.path.abspath(os.path.join(current_dir, "st_cache"))

from sentence_transformers import SentenceTransformer

print("Downloading and caching sentence-transformers model (all-MiniLM-L6-v2)...")
SentenceTransformer('all-MiniLM-L6-v2')
print("Model download and cache completed successfully!")
