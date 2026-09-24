"""Document processing pipeline for extracting and chunking text into LangChain Documents.
Supports Text-Only, Scanned/OCR (Gemini Vision), and Combination (Text + Charts/Diagrams) modes."""

import logging
import re
from typing import Any, List, Optional
from google import genai

import fitz  # PyMuPDF
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings

logger = logging.getLogger(__name__)


class DocumentProcessor:
    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            length_function=len,
            is_separator_regex=False,
        )
        self._genai_client: Optional[genai.Client] = None

    @property
    def genai_client(self) -> genai.Client:
        """Lazy load the Google GenAI client for Vision OCR & Captioning."""
        if self._genai_client is None:
            self._genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._genai_client

    def clean_text(self, text: str) -> str:
        """Clean excessive whitespace and normalize text."""
        text = re.sub(r"\n+", "\n", text)
        text = re.sub(r" +", " ", text)
        return text.strip()

    def process_text_pdf(
        self, file_bytes: bytes, document_id: str, metadata: dict[str, Any]
    ) -> List[Document]:
        """Extract and chunk text from a standard digital PDF file."""
        doc_name = metadata.get("title", metadata.get("filename", "Document"))
        department = metadata.get("department", "All")
        tags = metadata.get("tags", [])
        allowed_depts = metadata.get("allowed_departments", ["All"])
        if isinstance(allowed_depts, list):
            allowed_str = ",".join(allowed_depts)
        else:
            allowed_str = str(allowed_depts)
        is_public = ("All" in allowed_str) or ("General" in allowed_str) or (department in ["All", "General"]) or (not allowed_str)
        raw_docs = []
        total_extracted_chars = 0

        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            logger.info(f"Processing Text PDF '{doc_name}' ({document_id}) with {len(doc)} pages")

            page_count = len(doc)
            for page_num in range(page_count):
                try:
                    page = doc.load_page(page_num)
                    text = page.get_text("text")
                    cleaned_text = self.clean_text(text)

                    if cleaned_text:
                        total_extracted_chars += len(cleaned_text)
                        raw_docs.append(
                            Document(
                                page_content=cleaned_text,
                                metadata={
                                    "document_id": document_id,
                                    "document_name": doc_name,
                                    "title": doc_name,
                                    "page": page_num + 1,
                                    "page_number": page_num + 1,
                                    "department": department,
                                    "allowed_departments": allowed_str,
                                    "is_public": is_public,
                                    "tags": tags,
                                }
                            )
                        )
                except Exception as e:
                    logger.warning(f"Error processing page {page_num + 1} of {document_id}: {e}")
                    continue
            doc.close()

            # Auto-detection fallback: if extracted text is very short/blank across all pages, fallback to OCR
            if total_extracted_chars < 50 and page_count > 0:
                logger.info(f"Detected scanned PDF with insufficient digital text ({total_extracted_chars} chars). Falling back to Vision OCR.")
                return self.process_scanned_pdf(file_bytes, document_id, metadata)

            chunk_docs = self.text_splitter.split_documents(raw_docs)
            for i, chunk in enumerate(chunk_docs):
                chunk.metadata["chunk_index"] = i

            logger.info(f"Generated {len(chunk_docs)} LangChain chunks from Text PDF {document_id}")
            return chunk_docs

        except Exception as e:
            logger.error(f"Error processing text PDF document {document_id}: {e}", exc_info=True)
            return []

    def process_scanned_pdf(
        self, file_bytes: bytes, document_id: str, metadata: dict[str, Any]
    ) -> List[Document]:
        """Transcribe scanned pages/photocopies to Markdown using Gemini Vision OCR."""
        doc_name = metadata.get("title", metadata.get("filename", "Document"))
        department = metadata.get("department", "All")
        tags = metadata.get("tags", [])
        allowed_depts = metadata.get("allowed_departments", ["All"])
        if isinstance(allowed_depts, list):
            allowed_str = ",".join(allowed_depts)
        else:
            allowed_str = str(allowed_depts)
        is_public = ("All" in allowed_str) or ("General" in allowed_str) or (department in ["All", "General"]) or (not allowed_str)
        ocr_docs = []

        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            logger.info(f"Processing Scanned PDF '{doc_name}' ({document_id}) with {len(doc)} pages using Gemini Vision OCR")

            for page_num in range(len(doc)):
                try:
                    page = doc.load_page(page_num)
                    # Render page to high-res image (150 DPI)
                    pix = page.get_pixmap(dpi=150)
                    image_bytes = pix.tobytes("png")

                    # Ask Gemini Vision to transcribe the scanned page into structured Markdown
                    ocr_response = self.genai_client.models.generate_content(
                        model=settings.GEMINI_MODEL,
                        contents=[
                            "You are an expert document OCR engine. Transcribe all readable text, tables, forms, headers, and notes from this page into clean Markdown. If tables exist, format them using markdown tables. Do not include introductory conversational text.",
                            genai.types.Part.from_bytes(data=image_bytes, mime_type="image/png")
                        ]
                    )

                    transcribed_text = self.clean_text(ocr_response.text or "")
                    if transcribed_text:
                        ocr_docs.append(
                            Document(
                                page_content=transcribed_text,
                                metadata={
                                    "document_id": document_id,
                                    "document_name": doc_name,
                                    "title": doc_name,
                                    "page": page_num + 1,
                                    "page_number": page_num + 1,
                                    "department": department,
                                    "allowed_departments": allowed_str,
                                    "is_public": is_public,
                                    "tags": tags,
                                    "is_ocr": True,
                                }
                            )
                        )
                except Exception as e:
                    logger.warning(f"Error running OCR on page {page_num + 1} of {document_id}: {e}")
                    continue
            doc.close()

            chunk_docs = self.text_splitter.split_documents(ocr_docs)
            for i, chunk in enumerate(chunk_docs):
                chunk.metadata["chunk_index"] = i

            logger.info(f"Generated {len(chunk_docs)} LangChain chunks via Vision OCR for {document_id}")
            return chunk_docs

        except Exception as e:
            logger.error(f"Error processing scanned PDF document {document_id}: {e}", exc_info=True)
            return []

    def process_hybrid_pdf(
        self, file_bytes: bytes, document_id: str, metadata: dict[str, Any]
    ) -> List[Document]:
        """Extract digital text AND extract embedded charts/diagrams with Gemini Vision captioning."""
        doc_name = metadata.get("title", metadata.get("filename", "Document"))
        department = metadata.get("department", "All")
        allowed_depts = metadata.get("allowed_departments", ["All"])
        if isinstance(allowed_depts, list):
            allowed_str = ",".join(allowed_depts)
        else:
            allowed_str = str(allowed_depts)
        is_public = ("All" in allowed_str) or ("General" in allowed_str) or (department in ["All", "General"]) or (not allowed_str)

        # 1. Extract digital text chunks
        text_chunks = self.process_text_pdf(file_bytes, document_id, metadata)
        figure_docs = []

        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            logger.info(f"Extracting embedded figures & charts for '{doc_name}' ({document_id})")

            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                image_list = page.get_images(full=True)

                for img_idx, img_info in enumerate(image_list):
                    xref = img_info[0]
                    base_image = doc.extract_image(xref)
                    width = base_image.get("width", 0)
                    height = base_image.get("height", 0)

                    # Filter out small icons / decorative lines (< 100px)
                    if width < 100 or height < 100:
                        continue

                    img_bytes = base_image.get("image")
                    img_ext = base_image.get("ext", "png")
                    mime_type = f"image/{img_ext}" if img_ext in ["png", "jpeg", "jpg"] else "image/png"

                    try:
                        # Caption the diagram / chart with Gemini Vision
                        caption_response = self.genai_client.models.generate_content(
                            model=settings.GEMINI_MODEL,
                            contents=[
                                "Describe what this chart, diagram, or graphic represents in detail. Include all visible titles, axis labels, data points, process flows, and key takeaways.",
                                genai.types.Part.from_bytes(data=img_bytes, mime_type=mime_type)
                            ]
                        )
                        caption_text = self.clean_text(caption_response.text or "")
                        if caption_text:
                            figure_docs.append(
                                Document(
                                    page_content=f"[Figure/Chart on Page {page_num + 1} of {doc_name}]: {caption_text}",
                                    metadata={
                                        "document_id": document_id,
                                        "document_name": doc_name,
                                        "title": doc_name,
                                        "page": page_num + 1,
                                        "page_number": page_num + 1,
                                        "department": department,
                                        "allowed_departments": allowed_str,
                                        "is_public": is_public,
                                        "tags": tags,
                                        "is_figure_caption": True,
                                    }
                                )
                            )
                    except Exception as ex:
                        logger.warning(f"Error captioning image {img_idx} on page {page_num + 1}: {ex}")
                        continue
            doc.close()

            # Split figure docs if any are long
            caption_chunks = self.text_splitter.split_documents(figure_docs)
            all_chunks = text_chunks + caption_chunks

            # Re-index chunks
            for i, chunk in enumerate(all_chunks):
                chunk.metadata["chunk_index"] = i

            logger.info(f"Generated {len(all_chunks)} total chunks (Text: {len(text_chunks)}, Figures: {len(caption_chunks)}) for {document_id}")
            return all_chunks

        except Exception as e:
            logger.error(f"Error in hybrid PDF processing for {document_id}: {e}", exc_info=True)
            return text_chunks

    def process_txt(
        self, file_content: str, document_id: str, metadata: dict[str, Any]
    ) -> List[Document]:
        """Extract and chunk text from a plain text file into LangChain Documents."""
        doc_name = metadata.get("title", metadata.get("filename", "Document"))
        department = metadata.get("department", "All")
        tags = metadata.get("tags", [])
        allowed_depts = metadata.get("allowed_departments", ["All"])
        if isinstance(allowed_depts, list):
            allowed_str = ",".join(allowed_depts)
        else:
            allowed_str = str(allowed_depts)
        is_public = ("All" in allowed_str) or ("General" in allowed_str) or (department in ["All", "General"]) or (not allowed_str)

        try:
            cleaned_text = self.clean_text(file_content)
            if not cleaned_text:
                return []

            raw_doc = Document(
                page_content=cleaned_text,
                metadata={
                    "document_id": document_id,
                    "document_name": doc_name,
                    "title": doc_name,
                    "page": 1,
                    "page_number": 1,
                    "department": department,
                    "allowed_departments": allowed_str,
                    "is_public": is_public,
                    "tags": tags,
                }
            )

            chunk_docs = self.text_splitter.split_documents([raw_doc])
            for i, chunk in enumerate(chunk_docs):
                chunk.metadata["chunk_index"] = i

            logger.info(f"Generated {len(chunk_docs)} LangChain chunks from TXT {document_id}")
            return chunk_docs

        except Exception as e:
            logger.error(f"Error processing TXT document {document_id}: {e}")
            return []

    def process_document(
        self,
        file_bytes: bytes,
        filename: str,
        document_id: str,
        metadata: dict[str, Any],
        content_type: str = "text_only",
    ) -> List[Document]:
        """Route to appropriate processor based on file extension and selected content_type."""
        filename_lower = filename.lower()

        if filename_lower.endswith(".pdf"):
            if content_type == "images_only":
                return self.process_scanned_pdf(file_bytes, document_id, metadata)
            elif content_type == "combination":
                return self.process_hybrid_pdf(file_bytes, document_id, metadata)
            else:
                return self.process_text_pdf(file_bytes, document_id, metadata)
        elif filename_lower.endswith(".txt"):
            try:
                text_content = file_bytes.decode("utf-8")
                return self.process_txt(text_content, document_id, metadata)
            except UnicodeDecodeError as e:
                logger.error(f"Failed to decode text file {filename}: {e}")
                return []
        else:
            logger.error(f"Unsupported file format: {filename}")
            raise ValueError(
                f"Unsupported file format for {filename}. Only PDF and TXT are supported."
            )


# Singleton instance
document_processor = DocumentProcessor()


