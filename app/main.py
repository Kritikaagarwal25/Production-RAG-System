from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os
import uuid
import shutil
from app.utils.config import settings
from app.utils.db import init_db, add_document_metadata, get_all_metadata, delete_document
from app.ingestion.processor import extract_text_from_pdf
from app.ingestion.chunker import chunk_text
from app.retrieval.vector_store import (
    create_vector_store, 
    save_vector_store, 
    load_vector_store, 
    merge_vector_stores,
    similarity_search
)
from groq import AsyncGroq

app = FastAPI(title="DocuQuery Production RAG API")
groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    init_db()
    if not os.path.exists("temp"):
        os.makedirs("temp")
    if not os.path.exists(os.path.dirname(settings.VECTOR_STORE_PATH)):
        os.makedirs(os.path.dirname(settings.VECTOR_STORE_PATH), exist_ok=True)

@app.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 files allowed.")
    
    results = []
    vector_store = load_vector_store(settings.VECTOR_STORE_PATH)
    
    for file in files:
        if not file.filename.endswith(".pdf"):
            continue
            
        file_id = str(uuid.uuid4())
        temp_path = f"temp/{file_id}_{file.filename}"
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process PDF
        try:
            extraction = extract_text_from_pdf(temp_path)
            chunks = chunk_text(extraction["text"])
            
            # Embed and index
            new_store = create_vector_store(chunks, metadatas=[{"source": file.filename}] * len(chunks))
            vector_store = merge_vector_stores(vector_store, new_store)
            
            # Update metadata
            file_size = os.path.getsize(temp_path)
            add_document_metadata(
                file_id, 
                file.filename, 
                extraction["page_count"], 
                len(chunks), 
                file_size
            )
            
            results.append({"filename": file.filename, "status": "success", "chunks": len(chunks)})
        except Exception as e:
            print(f"❌ Error processing {file.filename}: {str(e)}")
            results.append({"filename": file.filename, "status": "error", "message": str(e)})
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    if vector_store:
        save_vector_store(vector_store, settings.VECTOR_STORE_PATH)
        
    return {"results": results}

@app.get("/metadata")
async def get_metadata():
    return get_all_metadata()

@app.delete("/document/{doc_id}")
async def delete_document_endpoint(doc_id: str):
    """Delete a document by ID — removes from DB and purges its chunks from the vector store."""
    import sqlite3
    from app.utils.config import settings
    from app.utils.db import get_db

    # 1. Get filename before deleting from DB
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT filename FROM documents WHERE id = ?', (doc_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Document not found.")

    filename = row["filename"]

    # 2. Remove from DB
    deleted = delete_document(doc_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete from database.")

    # 3. Rebuild vector store without this document's chunks
    try:
        vs = load_vector_store(settings.VECTOR_STORE_PATH)
        if vs:
            # Filter out chunks belonging to deleted document
            all_docs = vs.docstore._dict.values()
            remaining = [d for d in all_docs if d.metadata.get("source") != filename]
            if remaining:
                new_vs = create_vector_store(
                    [d.page_content for d in remaining],
                    metadatas=[d.metadata for d in remaining]
                )
                save_vector_store(new_vs, settings.VECTOR_STORE_PATH)
            else:
                # No documents left — delete the vector store files
                import glob
                for f in glob.glob(settings.VECTOR_STORE_PATH + "*"):
                    os.remove(f)
    except Exception as e:
        print(f"Warning: vector store cleanup error: {e}")

    return {"status": "deleted", "filename": filename}

async def generate_response(query: str):
    vector_store = load_vector_store(settings.VECTOR_STORE_PATH)
    if not vector_store:
        yield "Error: No documents uploaded yet. Please upload PDFs first."
        return

    # Retrieval
    docs = similarity_search(vector_store, query)
    context = "\n\n".join([d.page_content for d in docs])
    
    prompt = f"""You are a professional assistant. Answer the question strictly based on the provided context. If the answer is not in the context, say that you don't know based on the documents.

Context:
{context}

Question:
{query}

Answer:"""

    try:
        stream = await groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except Exception as e:
        yield f"Error during generation: {str(e)}"

@app.post("/query")
async def query_documents(payload: dict = Body(...)):
    query = payload.get("query")
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    return StreamingResponse(generate_response(query), media_type="text/plain")
