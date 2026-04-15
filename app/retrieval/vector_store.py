from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from typing import List
import os
from app.utils.config import settings

def get_embeddings():
    # Using local embeddings for better reliability and performance
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        cache_folder="app/storage/models"
    )

def create_vector_store(texts: List[str], metadatas: List[dict] = None):
    embeddings = get_embeddings()
    vector_store = FAISS.from_texts(texts, embeddings, metadatas=metadatas)
    return vector_store

def save_vector_store(vector_store, path: str):
    vector_store.save_local(path)

def load_vector_store(path: str):
    embeddings = get_embeddings()
    if os.path.exists(path):
        return FAISS.load_local(path, embeddings, allow_dangerous_deserialization=True)
    return None

def merge_vector_stores(main_store, new_store):
    if main_store is None:
        return new_store
    main_store.merge_from(new_store)
    return main_store

def similarity_search(vector_store, query: str, k: int = 4):
    return vector_store.similarity_search(query, k=k)
