import tempfile
import os
from typing import List, Dict, Any
from fastapi import UploadFile, HTTPException


class DocumentParserService:
    async def process_upload(self, file: UploadFile) -> List[Dict[str, Any]]:
        """
        Parses uploaded files (PDF, DOCX, TXT) without requiring system-level
        dependencies like poppler. Uses pdfplumber for PDFs and python-docx for DOCX.
        """
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")

        filename = file.filename.lower()
        content = await file.read()

        try:
            if filename.endswith(".pdf"):
                return await self._parse_pdf(content)
            elif filename.endswith(".docx"):
                return await self._parse_docx(content)
            elif filename.endswith(".txt"):
                return await self._parse_txt(content)
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Unsupported file type. Please upload PDF, DOCX, or TXT."
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse document: {str(e)}")

    async def _parse_pdf(self, content: bytes) -> List[Dict[str, Any]]:
        """Parse PDF using pdfplumber - no poppler required."""
        import pdfplumber
        import io

        elements = []
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                text = page.extract_text()
                if text and text.strip():
                    # Split text into paragraphs for better structure
                    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
                    for para in paragraphs:
                        elements.append({
                            "text": para,
                            "type": "NarrativeText",
                            "page_number": page_num
                        })

        return elements

    async def _parse_docx(self, content: bytes) -> List[Dict[str, Any]]:
        """Parse DOCX using python-docx - fully self-contained."""
        from docx import Document
        import io

        elements = []
        doc = Document(io.BytesIO(content))

        for para in doc.paragraphs:
            if para.text.strip():
                # Identify headings vs body text
                element_type = "Title" if para.style.name.startswith("Heading") else "NarrativeText"
                elements.append({
                    "text": para.text.strip(),
                    "type": element_type,
                    "page_number": None  # DOCX doesn't have explicit page numbers
                })

        return elements

    async def _parse_txt(self, content: bytes) -> List[Dict[str, Any]]:
        """Parse plain text files."""
        text = content.decode("utf-8", errors="replace")
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]

        return [
            {"text": para, "type": "NarrativeText", "page_number": None}
            for para in paragraphs
        ]


document_parser = DocumentParserService()
