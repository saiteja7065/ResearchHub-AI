from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import workspaces, chat

app = FastAPI(title="ResearchHub AI Backend")

# Configure CORS for React frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(workspaces.router)
app.include_router(chat.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to ResearchHub AI API"}
