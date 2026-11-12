import json
import uuid
from pathlib import Path
from typing import List

from typing import List
from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from pydantic import BaseModel, Field

from app.database import (
    create_dispute,
    get_disputes,
    get_dispute_by_id,
    save_dispute_analysis,
    record_dispute_decision,
)

from app.services.claimloop_service import analyze_dispute
from app.database import (
    initialize_database,
    save_evidence_analysis,
    get_evidence_history,
    get_evidence_by_id,
)
import logging

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from app.services.evidence_service import (
    extract_document_text,
    analyze_evidence,
)

from app.services.paypal_service import get_paypal_access_token
from app.services.paypal_service import create_paypal_order

from app.services.paypal_service import (
    get_paypal_access_token,
    create_paypal_order,
    get_paypal_order,
    capture_paypal_order,
)

from app.database import (
    save_paypal_order,
    get_paypal_payment,
    update_paypal_capture,
    get_paypal_payment_history,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
BASE_DIR = Path(__file__).resolve().parents[1]
CLAIMLOOP_UPLOAD_DIR = BASE_DIR / "uploads" / "claimloop"
CLAIMLOOP_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_DISPUTE_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_DISPUTE_EXTENSIONS = {".pdf", ".docx", ".txt"}
app = FastAPI(
    title="EscrowPilot 360 API",
    version="1.0.0",
)
class DisputeDecisionRequest(BaseModel):
    decision: str
    decision_notes: str = Field(min_length=5, max_length=3000)
@app.on_event("startup")
async def startup_event():
    initialize_database()
    logger.info("Evidence History database initialized.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "EscrowPilot 360 API is running",
        "status": "success",
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "EscrowPilot 360 API",
    }


@app.post("/api/evidence/analyze")
async def analyze_evidence_endpoint(
    project_name: str = Form(...),
    milestone_title: str = Form(...),
    acceptance_criteria: str = Form(...),
    file: UploadFile = File(...),
):
    try:
        filename = file.filename or ""

        if not filename.lower().endswith((".pdf", ".docx", ".txt")):
            raise HTTPException(
                status_code=400,
                detail="Only PDF, DOCX and TXT files are supported.",
            )

        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty.",
            )

        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="File size must not exceed 10 MB.",
            )

        evidence_text = await run_in_threadpool(
            extract_document_text,
            filename,
            content,
        )

        if not evidence_text.strip():
            raise HTTPException(
                status_code=400,
                detail="No readable text found in the uploaded document.",
            )

        result = await run_in_threadpool(
            analyze_evidence,
            project_name,
            milestone_title,
            acceptance_criteria,
            evidence_text,
        )
        history_id = await run_in_threadpool(
           save_evidence_analysis,
           project_name,
           milestone_title,
           acceptance_criteria,
           filename,
           result,
        )

        return {
            "success": True,
             "history_id": history_id,
            "analysis": result,
        }

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception("Evidence analysis failed")
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )

    finally:
        await file.close()

@app.get("/api/evidence/history")
async def list_evidence_history():
    records = await run_in_threadpool(
        get_evidence_history,
        100,
    )

    return {
        "success": True,
        "count": len(records),
        "history": records,
    }


@app.get("/api/evidence/history/{record_id}")
async def retrieve_evidence_history(record_id: int):
    record = await run_in_threadpool(
        get_evidence_by_id,
        record_id,
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence history record not found.",
        )

    return {
        "success": True,
        "record": record,
    }

# ==========================================================
# CLAIMLOOP API
# ==========================================================

@app.post("/api/claimloop/disputes")
async def create_claimloop_dispute(
    project_name: str = Form(...),
    milestone_title: str = Form(...),
    dispute_title: str = Form(...),
    claimant_role: str = Form(...),
    counterparty_name: str = Form(...),
    disputed_amount: float = Form(...),
    currency: str = Form("INR"),
    dispute_reason: str = Form(...),
    claimant_statement: str = Form(...),
    respondent_statement: str = Form(""),
    files: List[UploadFile] = File(default=[]),
):
    saved_paths = []
    saved_names = []

    try:
        if disputed_amount <= 0:
            raise HTTPException(
                status_code=400,
                detail="Disputed amount must be greater than zero.",
            )

        if claimant_role not in {"Client", "Freelancer"}:
            raise HTTPException(
                status_code=400,
                detail="Claimant role must be Client or Freelancer.",
            )

        if not project_name.strip() or not milestone_title.strip():
            raise HTTPException(
                status_code=400,
                detail="Project and milestone names are required.",
            )

        if not dispute_title.strip() or not dispute_reason.strip():
            raise HTTPException(
                status_code=400,
                detail="Dispute title and reason are required.",
            )

        if not claimant_statement.strip():
            raise HTTPException(
                status_code=400,
                detail="Claimant statement is required.",
            )

        for uploaded_file in files:
            original_name = uploaded_file.filename or ""
            extension = Path(original_name).suffix.lower()

            if extension not in ALLOWED_DISPUTE_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail="Only PDF, DOCX and TXT evidence files are supported.",
                )

            content = await uploaded_file.read()

            if not content:
                raise HTTPException(
                    status_code=400,
                    detail=f"{original_name} is empty.",
                )

            if len(content) > MAX_DISPUTE_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"{original_name} exceeds the 10 MB limit.",
                )

            safe_name = f"{uuid.uuid4().hex}{extension}"
            destination = CLAIMLOOP_UPLOAD_DIR / safe_name
            destination.write_bytes(content)

            saved_paths.append(destination)
            saved_names.append({
                "stored_name": safe_name,
                "original_name": Path(original_name).name,
            })

        dispute_id = await run_in_threadpool(
            create_dispute,
            project_name.strip(),
            milestone_title.strip(),
            dispute_title.strip(),
            claimant_role,
            counterparty_name.strip(),
            disputed_amount,
            currency.strip().upper(),
            dispute_reason.strip(),
            claimant_statement.strip(),
            respondent_statement.strip(),
            saved_names,
        )

        return {
            "success": True,
            "message": "Dispute created successfully.",
            "dispute_id": dispute_id,
            "status": "Open",
            "evidence_count": len(saved_names),
        }

    except HTTPException:
        for path in saved_paths:
            path.unlink(missing_ok=True)
        raise

    except Exception as exc:
        for path in saved_paths:
            path.unlink(missing_ok=True)

        logger.exception("ClaimLoop dispute creation failed")
        raise HTTPException(
            status_code=500,
            detail="Unable to create dispute.",
        )

    finally:
        for uploaded_file in files:
            await uploaded_file.close()


@app.get("/api/claimloop/disputes")
async def list_claimloop_disputes():
    records = await run_in_threadpool(get_disputes, 100)

    return {
        "success": True,
        "count": len(records),
        "disputes": records,
    }


@app.get("/api/claimloop/disputes/{dispute_id}")
async def retrieve_claimloop_dispute(dispute_id: int):
    record = await run_in_threadpool(
        get_dispute_by_id,
        dispute_id,
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Dispute not found.",
        )

    return {
        "success": True,
        "dispute": record,
    }


@app.post("/api/claimloop/disputes/{dispute_id}/analyze")
async def analyze_claimloop_dispute(dispute_id: int):
    record = await run_in_threadpool(
        get_dispute_by_id,
        dispute_id,
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Dispute not found.",
        )

    if record["status"] in {
        "Resolved - Claimant",
        "Resolved - Respondent",
    }:
        raise HTTPException(
            status_code=409,
            detail="This dispute has already been resolved.",
        )

    evidence_parts = []

    for evidence in record["evidence_files"]:
        stored_name = evidence.get("stored_name", "")
        original_name = evidence.get("original_name", "")

        # Never accept a path from the database as a filesystem path.
        safe_name = Path(stored_name).name

        if safe_name != stored_name:
            continue

        file_path = CLAIMLOOP_UPLOAD_DIR / safe_name

        if not file_path.is_file():
            evidence_parts.append(
                f"Evidence file {original_name}: File unavailable."
            )
            continue

        content = file_path.read_bytes()

        try:
            extracted = await run_in_threadpool(
                extract_document_text,
                original_name,
                content,
            )
            evidence_parts.append(
                f"Evidence: {original_name}\n{extracted}"
            )
        except Exception as exc:
            evidence_parts.append(
                f"Evidence: {original_name}\n"
                f"Text extraction failed: {exc}"
            )

    combined_evidence = "\n\n".join(evidence_parts)

    if not combined_evidence:
        combined_evidence = "No supporting documents were uploaded."

    try:
        analysis = await run_in_threadpool(
            analyze_dispute,
            record["project_name"],
            record["milestone_title"],
            record["dispute_title"],
            record["claimant_role"],
            record["counterparty_name"],
            record["disputed_amount"],
            record["currency"],
            record["dispute_reason"],
            record["claimant_statement"],
            record["respondent_statement"],
            combined_evidence,
        )

        await run_in_threadpool(
            save_dispute_analysis,
            dispute_id,
            analysis,
        )

        return {
            "success": True,
            "dispute_id": dispute_id,
            "analysis": analysis,
            "human_review_required": True,
        }

    except Exception:
        logger.exception("ClaimLoop dispute analysis failed")
        raise HTTPException(
            status_code=502,
            detail="AI dispute analysis failed. Please retry.",
        )


@app.post("/api/claimloop/disputes/{dispute_id}/decision")
async def decide_claimloop_dispute(
    dispute_id: int,
    request: DisputeDecisionRequest,
):
    record = await run_in_threadpool(
        get_dispute_by_id,
        dispute_id,
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Dispute not found.",
        )

    if not record.get("analysis"):
        raise HTTPException(
            status_code=409,
            detail="Run AI investigation before recording a decision.",
        )

    try:
        updated = await run_in_threadpool(
            record_dispute_decision,
            dispute_id,
            request.decision,
            request.decision_notes,
        )

        if not updated:
            raise HTTPException(
                status_code=404,
                detail="Dispute not found.",
            )

        return {
            "success": True,
            "message": "Human decision recorded.",
            "dispute_id": dispute_id,
            "decision": request.decision,
            "payment_action": "Not performed",
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )
@app.get("/api/paypal/connection-test")
def paypal_connection_test():
    try:
        token_data = get_paypal_access_token()

        return {
            "success": True,
            "message": "PayPal Sandbox connected successfully.",
            "mode": "sandbox",
            "token_type": token_data.get("token_type"),
            "expires_in": token_data.get("expires_in"),
        }

    except RuntimeError as exc:
        logger.error("PayPal connection test failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))


from pydantic import BaseModel, Field


class PayPalOrderRequest(BaseModel):
    amount: float = Field(gt=0, le=100000)
    currency: str = "USD"



@app.post("/api/paypal/create-order")
def create_paypal_order_endpoint(payload: PayPalOrderRequest):
    try:
        currency = payload.currency.upper()

        if currency != "USD":
            raise HTTPException(
                status_code=400,
                detail="Only USD is supported for this Sandbox integration."
            )

        amount_value = f"{payload.amount:.2f}"

        result = create_paypal_order(
            amount=amount_value,
            currency=currency,
        )

        order_id = result.get("id")
        if not order_id:
            raise RuntimeError("PayPal did not return an order ID.")

        approval_url = next(
            (
                link["href"]
                for link in result.get("links", [])
                if link.get("rel") == "approve"
            ),
            None,
        )

        if not approval_url:
            raise RuntimeError("PayPal did not return an approval link.")

        # Store the amount and currency from our validated request.
        # The verification endpoint will compare these against PayPal.
        save_paypal_order(
            order_id=order_id,
            amount=amount_value,
            currency=currency,
            status=result.get("status", "CREATED"),
            order_data=result,
        )

        return {
            "success": True,
            "order_id": order_id,
            "status": result.get("status"),
            "amount": amount_value,
            "currency": currency,
            "approval_url": approval_url,
        }

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        logger.error("PayPal order creation failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))

@app.get("/api/paypal/order/{order_id}")
def verify_paypal_order(order_id: str):
    try:
        result = get_paypal_order(order_id)
        return {
            "success": True,
            "order_id": result.get("id"),
            "status": result.get("status"),
            "purchase_units": result.get("purchase_units", []),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

@app.post("/api/paypal/capture-order/{order_id}")
def capture_paypal_order_endpoint(order_id: str):
    try:
        # Only capture orders that this application recorded.
        saved_order = get_paypal_payment(order_id)

        if saved_order is None:
            raise HTTPException(
                status_code=404,
                detail="Order not found in EscrowPilot payment records."
            )

        # Prevent duplicate captures.
        if saved_order["status"] == "COMPLETED":
            raise HTTPException(
                status_code=409,
                detail="This payment has already been captured."
            )

        # Verify current order status directly with PayPal.
        order = get_paypal_order(order_id)

        if order.get("status") != "APPROVED":
            raise HTTPException(
                status_code=409,
                detail="PayPal order is not approved."
            )

        purchase_units = order.get("purchase_units", [])

        if not purchase_units:
            raise HTTPException(
                status_code=400,
                detail="No purchase units found."
            )

        remote_amount = purchase_units[0].get("amount", {})

        # Compare PayPal's amount against our saved order.
        if (
            remote_amount.get("value") != saved_order["amount"]
            or remote_amount.get("currency_code") != saved_order["currency"]
        ):
            raise HTTPException(
                status_code=400,
                detail="PayPal amount or currency does not match the saved order."
            )

        result = capture_paypal_order(order_id)

        capture_units = result.get("purchase_units", [])
        captures = (
            capture_units[0]
            .get("payments", {})
            .get("captures", [])
            if capture_units else []
        )

        if not captures:
            raise RuntimeError("PayPal returned no capture details.")

        capture = captures[0]

        if result.get("status") != "COMPLETED" or capture.get("status") != "COMPLETED":
            raise HTTPException(
                status_code=409,
                detail="PayPal has not confirmed a completed capture."
            )

        capture_id = capture.get("id")
        if not capture_id:
            raise RuntimeError("PayPal did not return a capture ID.")

        payer_email = (
            result.get("payer", {}).get("email_address")
        )

        update_paypal_capture(
            order_id=order_id,
            capture_id=capture_id,
            status=result.get("status"),
            capture_status=capture.get("status"),
            payer_email=payer_email,
            capture_data=result,
        )

        return {
            "success": True,
            "order_id": order_id,
            "capture_id": capture_id,
            "status": result.get("status"),
            "capture_status": capture.get("status"),
            "amount": capture.get("amount"),
            "message": "Payment captured and recorded successfully."
        }

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        logger.error("PayPal capture failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))
@app.get("/api/paypal/history")
def paypal_payment_history():
    records = get_paypal_payment_history(100)

    return {
        "success": True,
        "count": len(records),
        "transactions": records,
    }