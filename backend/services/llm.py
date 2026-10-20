import os
from typing import Any, Dict, List
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

# Model IDs are configurable so a provider-side model retirement only needs an env change.
# llama-3.3-70b-versatile was retired by Groq; gpt-oss-120b is the current flagship.
LLM_MODEL = os.getenv("LLM_MODEL", "openai/gpt-oss-120b")
LLM_FAST_MODEL = os.getenv("LLM_FAST_MODEL", "openai/gpt-oss-20b")

# gpt-oss models are reasoning models; "low" effort keeps latency close to a non-reasoning model.
_REASONING_EFFORT = os.getenv("LLM_REASONING_EFFORT", "low")

_client = None


def get_client() -> Groq:
    """Single shared Groq client (reuses the underlying HTTP connection pool)."""
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROQ_API_KEY"), timeout=60.0, max_retries=2)
    return _client


def _model_kwargs(model: str) -> Dict[str, Any]:
    if model.startswith("openai/gpt-oss"):
        return {"reasoning_effort": _REASONING_EFFORT}
    return {}


def complete(messages: List[Dict[str, str]], model: str = None, temperature: float = 0.5, max_tokens: int = 2048, **kwargs) -> str:
    model = model or LLM_MODEL
    resp = get_client().chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        **_model_kwargs(model),
        **kwargs,
    )
    return resp.choices[0].message.content or ""


def stream(messages: List[Dict[str, str]], model: str = None, temperature: float = 0.5, max_tokens: int = 2048):
    model = model or LLM_MODEL
    return get_client().chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
        **_model_kwargs(model),
    )
