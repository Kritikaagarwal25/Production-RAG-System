import sqlite3
import os
from app.utils.config import settings

def get_db():
    db_dir = os.path.dirname(settings.DB_PATH)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    
    conn = sqlite3.connect(settings.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            page_count INTEGER,
            chunk_count INTEGER,
            file_size INTEGER
        )
    ''')
    conn.commit()
    conn.close()

def add_document_metadata(doc_id, filename, page_count, chunk_count, file_size):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO documents (id, filename, page_count, chunk_count, file_size)
        VALUES (?, ?, ?, ?, ?)
    ''', (doc_id, filename, page_count, chunk_count, file_size))
    conn.commit()
    conn.close()

def get_all_metadata():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM documents ORDER BY upload_date DESC')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_document(doc_id: str) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM documents WHERE id = ?', (doc_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted
