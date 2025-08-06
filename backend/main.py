from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import List
import pymongo
import os

load_dotenv()

# ENV variables
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION")
VECTOR_INDEX = os.getenv("VECTOR_INDEX")

# Mongo connection
client = pymongo.MongoClient(MONGO_URI)
db = client[MONGO_DB]
collection = db[MONGO_COLLECTION]

# Load model once
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  # or ["*"] during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request schema
class Query(BaseModel):
    text: str

# Function: Generate embedding
def generate_embedding(text: str) -> List[float]:
    return model.encode([text])[0].tolist()

# Function: Search movies
def search_movies(query: str, limit: int = 30):
    embedding = generate_embedding(query)
    results = collection.aggregate([
        {
            "$vectorSearch": {
                "queryVector": embedding,
                "path": "plot_embedding_hf",
                "numCandidates": 100,
                "limit": limit,
                "index": VECTOR_INDEX,
            }
        }
    ])
    return [{"title": r["title"], "plot": r["plot"]} for r in results]

# API Route: Search endpoint
@app.post("/search")
def search(query: Query):
    try:
        result = search_movies(query.text)
        return {"results": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


