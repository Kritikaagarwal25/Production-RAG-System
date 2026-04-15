# DocuQuery AI — Production RAG System

> A production-grade **Retrieval-Augmented Generation (RAG)** system with a **ChatGPT-style UI**, built with FastAPI, FAISS, HuggingFace Embeddings, and Groq LLM.

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)
![FAISS](https://img.shields.io/badge/FAISS-Vector%20Store-orange?style=flat-square)
![Groq](https://img.shields.io/badge/Groq-LLaMA%203.3%2070B-purple?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## ✨ Features

| Feature | Details |
|---|---|
| 📄 **PDF Ingestion** | Upload up to **10 PDFs** at once; text extracted via PyMuPDF |
| 🔍 **Semantic Search** | FAISS vector store + HuggingFace embeddings for fast retrieval |
| ⚡ **Streaming Chat** | Real-time token-by-token answers via Groq (LLaMA 3.3 70B) |
| 🗑️ **Document Delete** | Remove any indexed document from the knowledge base via UI |
| 🧹 **Auto Chat Clear** | Chat resets automatically on new upload or document delete |
| 💻 **ChatGPT-style UI** | Dark sidebar, collapsible panel, message bubbles, auto-resize input |
| 🗄️ **Metadata Tracking** | SQLite-backed document registry (page count, chunk count, size) |
| 🐳 **Dockerized** | One-command deployment with Docker Compose |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI (Python) |
| **LLM** | Groq API — `llama-3.3-70b-versatile` |
| **Embeddings** | HuggingFace — `sentence-transformers/all-MiniLM-L6-v2` |
| **Vector Store** | FAISS (local, persistent) |
| **Database** | SQLite (document metadata) |
| **PDF Processing** | PyMuPDF |
| **Frontend** | Vanilla HTML / CSS / JavaScript |
| **Deployment** | Docker & Docker Compose |

---

## 🚀 Quick Start (Local)

### Prerequisites
- Python 3.10+
- A **Groq API key** → [console.groq.com](https://console.groq.com)
- A **HuggingFace token** → [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

### 1. Clone & Setup Environment

```bash
git clone https://github.com/your-username/Production-RAG-System.git
cd Production-RAG-System

python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your keys:

```env
GROQ_API_KEY=gsk_your_groq_api_key_here
HUGGINGFACEHUB_API_TOKEN=hf_your_huggingface_token_here
PORT=8000
HOST=0.0.0.0
DB_PATH=app/storage/metadata.db
VECTOR_STORE_PATH=app/storage/faiss_index
```

### 3. Start the Backend

```bash
./start.sh
# OR manually:
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Open the Frontend

Open `frontend/index.html` directly in your browser:

```bash
open frontend/index.html       # macOS
xdg-open frontend/index.html  # Linux
```

Or serve it with any static server:
```bash
npx serve frontend
```

---

## 🐳 Docker Deployment

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:8080 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |

---

## 📡 API Reference

### Upload Documents
```bash
curl -X POST "http://localhost:8000/upload" \
     -F "files=@document1.pdf" \
     -F "files=@document2.pdf"
```

### Query (Streaming)
```bash
curl -X POST "http://localhost:8000/query" \
     -H "Content-Type: application/json" \
     -d '{"query": "What are the main findings?"}'
```

### Get All Documents (Metadata)
```bash
curl -X GET "http://localhost:8000/metadata"
```

### Delete a Document
```bash
curl -X DELETE "http://localhost:8000/document/{doc_id}"
```

---

## 📁 Project Structure

```
Production-RAG-System/
├── app/
│   ├── main.py              # FastAPI app + all API routes
│   ├── api/                 # (Reserved for route modularization)
│   ├── ingestion/
│   │   ├── processor.py     # PDF text extraction (PyMuPDF)
│   │   └── chunker.py       # Text chunking with overlap
│   ├── embeddings/          # HuggingFace embedding wrapper
│   ├── retrieval/
│   │   └── vector_store.py  # FAISS create/load/save/merge/search
│   ├── utils/
│   │   ├── config.py        # Settings from .env
│   │   └── db.py            # SQLite CRUD operations
│   └── storage/
│       ├── metadata.db      # SQLite database (auto-created)
│       └── faiss_index.*    # FAISS index files (auto-created)
├── frontend/
│   ├── index.html           # ChatGPT-style UI layout
│   ├── style.css            # Dark theme, sidebar, animations
│   └── script.js            # Upload, delete, streaming chat logic
├── tests/                   # Unit & integration tests
├── Dockerfile               # Backend container
├── docker-compose.yml       # Multi-container orchestration
├── requirements.txt         # Python dependencies
├── start.sh                 # Local dev startup script
└── .env.example             # Environment variable template
```

---

## 🖥️ Frontend Usage

### Chat Mode (default)
- Type your question in the input bar at the bottom
- Press **Enter** to send, **Shift+Enter** for a new line
- Answers stream in real-time token by token

### Documents Panel
- Click **Documents** in the sidebar (or the "Documents" button in the top bar)
- **Drag & drop** PDFs or click the upload zone to browse
- Maximum **10 documents** can be queued at once
- Click **Process Documents** to ingest and index
- After successful upload, chat is automatically **cleared** so you start fresh with the new document's context

### Deleting a Document
- In the Documents panel → Knowledge Base section
- **Hover** over any document to reveal the 🗑 delete icon
- Click to delete → confirmation prompt appears
- On confirmation: document is removed from DB + vector store, and chat resets

---

## 🧪 Running Tests

```bash
source venv/bin/activate
pytest tests/ -v
```

---

## 📝 License

MIT License — Built by **Ankush Choudhary**
