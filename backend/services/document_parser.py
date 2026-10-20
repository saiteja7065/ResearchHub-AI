import re
from typing import List, Dict, Any
from fastapi import UploadFile, HTTPException
from fastapi.concurrency import run_in_threadpool

# The embedding model truncates input at 256 tokens (~1000 chars), so text is split into
# chunks under that size; anything longer would be silently cut off and never be searchable.
CHUNK_CHARS = 900
CHUNK_OVERLAP = 150


def chunk_text(text: str) -> List[str]:
    """Split text into overlapping chunks on sentence boundaries where possible."""
    text = re.sub(r"[ \t]+", " ", text).strip()
    if len(text) <= CHUNK_CHARS:
        return [text] if text else []

    sentences = re.split(r"(?<=[.!?])\s+|\n+", text)
    chunks, current = [], ""
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        # Hard-split pathological "sentences" (tables, reference lists) longer than a chunk
        while len(sentence) > CHUNK_CHARS:
            if current:
                chunks.append(current)
                current = ""
            chunks.append(sentence[:CHUNK_CHARS])
            sentence = sentence[CHUNK_CHARS - CHUNK_OVERLAP:]
        if current and len(current) + len(sentence) + 1 > CHUNK_CHARS:
            chunks.append(current)
            # Carry the tail of the previous chunk forward so ideas spanning a boundary stay retrievable
            current = current[-CHUNK_OVERLAP:].split(" ", 1)[-1] + " " + sentence
        else:
            current = f"{current} {sentence}".strip()
    if current:
        chunks.append(current)
    return chunks


class DocumentParserService:
    async def process_upload(self, file: UploadFile) -> List[Dict[str, Any]]:
        """
        Parses uploaded files (PDF, DOCX, TXT) without requiring system-level
        dependencies like poppler. Uses pdfplumber for PDFs and python-docx for DOCX.
        Parsing is CPU-bound, so it runs in the threadpool instead of blocking the event loop.
        """
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")

        filename = file.filename.lower()
        content = await file.read()

        try:
            if filename.endswith(".pdf"):
                return await run_in_threadpool(self._parse_pdf, content)
            elif filename.endswith(".docx"):
                return await run_in_threadpool(self._parse_docx, content)
            elif filename.endswith(".txt"):
                return await run_in_threadpool(self._parse_txt, content)
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Unsupported file type. Please upload PDF, DOCX, or TXT."
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse document: {str(e)}")

    def _parse_pdf(self, content: bytes) -> List[Dict[str, Any]]:
        """Parse PDF using pdfplumber - no poppler required."""
        import pdfplumber
        import io

        elements = []
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                text = page.extract_text()
                if text and text.strip():
                    for chunk in chunk_text(text):
                        elements.append({
                            "text": chunk,
                            "type": "NarrativeText",
                            "page_number": page_num
                        })

        return elements

    def _parse_docx(self, content: bytes) -> List[Dict[str, Any]]:
        """Parse DOCX using python-docx - fully self-contained."""
        from docx import Document
        import io

        elements = []
        doc = Document(io.BytesIO(content))

        for para in doc.paragraphs:
            if para.text.strip():
                # Identify headings vs body text
                element_type = "Title" if para.style.name.startswith("Heading") else "NarrativeText"
                for chunk in chunk_text(para.text):
                    elements.append({
                        "text": chunk,
                        "type": element_type,
                        "page_number": None  # DOCX doesn't have explicit page numbers
                    })

        return elements

    def _parse_txt(self, content: bytes) -> List[Dict[str, Any]]:
        """Parse plain text files."""
        text = content.decode("utf-8", errors="replace")
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]

        return [
            {"text": chunk, "type": "NarrativeText", "page_number": None}
            for para in paragraphs
            for chunk in chunk_text(para)
        ]


document_parser = DocumentParserService()
