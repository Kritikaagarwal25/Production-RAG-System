from pypdf import PdfReader
from typing import List, Dict

def extract_text_from_pdf(pdf_path: str) -> Dict[str, any]:
    """Extracts text and metadata from a PDF file using pypdf."""
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    
    metadata = {
        "page_count": len(reader.pages),
        "text": text
    }
    return metadata
