import os
from huggingface_hub import hf_hub_download

current_dir = os.path.dirname(os.path.abspath(__file__))
local_dir = os.path.join(current_dir, "model_cache")

print("Downloading and caching ONNX model and tokenizer from Xenova/all-MiniLM-L6-v2...")
try:
    hf_hub_download(
        repo_id="Xenova/all-MiniLM-L6-v2",
        filename="onnx/model.onnx",
        local_dir=local_dir
    )
    hf_hub_download(
        repo_id="Xenova/all-MiniLM-L6-v2",
        filename="tokenizer.json",
        local_dir=local_dir
    )
    print("Model download and cache completed successfully!")
except Exception as e:
    print(f"Error downloading model: {e}")
    exit(1)
