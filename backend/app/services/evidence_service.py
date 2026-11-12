
import io
import os
import json
import logging
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq
from pypdf import PdfReader
from docx import Document

logger = logging.getLogger(__name__)

# Load environment variables from backend/.env
BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_FILE, override=True)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "llama-3.3-70b-versatile",
)

MAX_TEXT_LENGTH = 20000
MAX_PDF_PAGES = 100
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


def extract_document_text(filename: str, content: bytes) -> str:
    """Extract readable text from PDF, DOCX or TXT evidence."""

    if not filename:
        raise ValueError("Filename is required.")

    if not content:
        raise ValueError("Uploaded document is empty.")

    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError("Only PDF, DOCX and TXT files are supported.")

    if extension == ".txt":
        extracted_text = content.decode("utf-8-sig")

    elif extension == ".pdf":
        reader = PdfReader(io.BytesIO(content))

        if reader.is_encrypted:
            raise ValueError("Encrypted PDF files are not supported.")

        if len(reader.pages) > MAX_PDF_PAGES:
            raise ValueError("PDF exceeds the 100-page limit.")

        extracted_text = "\n".join(
            page.extract_text() or ""
            for page in reader.pages
        )

    else:
        document = Document(io.BytesIO(content))
        extracted_text = "\n".join(
            paragraph.text
            for paragraph in document.paragraphs
        )

        for table in document.tables:
            for row in table.rows:
                extracted_text += "\n" + " | ".join(
                    cell.text for cell in row.cells
                )

    extracted_text = extracted_text.strip()

    if not extracted_text:
        raise ValueError(
            "No readable text found. Scanned PDFs may require OCR."
        )

    return extracted_text[:MAX_TEXT_LENGTH]


def validate_analysis_result(result: dict) -> dict:
    """Validate the structure returned by the AI model."""

    required_fields = [
        "completion_score",
        "overall_status",
        "summary",
        "matched_criteria",
        "missing_criteria",
        "risks",
        "recommendation",
        "recommendation_reason",
    ]

    for field in required_fields:
        if field not in result:
            raise ValueError(f"AI response is missing field: {field}")

    if result["overall_status"] not in [
        "Completed",
        "Partially Completed",
        "Needs Review",
    ]:
        raise ValueError("Invalid overall_status.")

    if result["recommendation"] not in [
        "Approve",
        "Request Changes",
        "Manual Review",
    ]:
        raise ValueError("Invalid recommendation.")

    score = result["completion_score"]

    if not isinstance(score, (int, float)) or not 0 <= score <= 100:
        raise ValueError("completion_score must be between 0 and 100.")

    return result


def analyze_evidence(
    project_name: str,
    milestone_title: str,
    acceptance_criteria: str,
    evidence_text: str,
) -> dict:
    """Analyze uploaded milestone evidence using the Groq API."""

    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise RuntimeError("GROQ_API_KEY is missing from backend/.env.")

    client = Groq(api_key=api_key)

    system_prompt = """
You are an evidence analysis assistant for EscrowPilot 360.

Analyze milestone evidence strictly against the supplied acceptance criteria.
Do not invent facts. If evidence is insufficient, say so.
Do not authorize, release, capture, or refund payments.

Return only valid JSON with these fields:
{
  "completion_score": 0,
  "overall_status": "Needs Review",
  "summary": "Evidence-based summary",
  "matched_criteria": [],
  "missing_criteria": [],
  "risks": [],
  "recommendation": "Manual Review",
  "recommendation_reason": "Explanation"
}

For matched_criteria and missing_criteria, use objects with:
"criterion", "status", and "evidence".

Allowed criterion statuses:
"Met", "Partially Met", "Not Met", "Unclear".

Allowed overall_status:
"Completed", "Partially Completed", "Needs Review".

Allowed recommendation:
"Approve", "Request Changes", "Manual Review".

A recommendation is advisory only. Human approval is required.
"""

    user_prompt = f"""
Project: {project_name}
Milestone: {milestone_title}

Acceptance criteria:
{acceptance_criteria}

Uploaded evidence:
{evidence_text}
"""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )

        response_text = response.choices[0].message.content

        if not response_text:
            raise ValueError("The AI returned an empty response.")

        result = json.loads(response_text)

        return validate_analysis_result(result)

    except Exception as exc:
        logger.exception("Groq evidence analysis failed")
        raise RuntimeError(f"Evidence analysis failed: {exc}") from exc
