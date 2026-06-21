import os
from sentence_transformers import SentenceTransformer

# Force sentence-transformers to download model weights directly into the project folder
current_dir = os.path.dirname(os.path.abspath(__file__))
os.environ["SENTENCE_TRANSFORMERS_HOME"] = os.path.abspath(os.path.join(current_dir, "st_cache"))

print("Downloading and caching sentence-transformers model (all-MiniLM-L6-v2)...")
SentenceTransformer('all-MiniLM-L6-v2')
print("Model download and cache completed successfully!")
