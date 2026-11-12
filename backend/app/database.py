
import sqlite3
import json
from pathlib import Path
from datetime import datetime, timezone

BASE_DIR = Path(__file__).resolve().parents[1]
DATABASE_PATH = BASE_DIR / "escrowpilot.db"


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with get_connection() as connection:

        # Existing Evidence History table
                # PayPal payment transactions
        connection.execute("""
            CREATE TABLE IF NOT EXISTS payment_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                paypal_order_id TEXT NOT NULL UNIQUE,
                paypal_capture_id TEXT DEFAULT NULL,
                amount TEXT NOT NULL,
                currency TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'CREATED',
                capture_status TEXT DEFAULT NULL,
                payer_email TEXT DEFAULT NULL,
                order_json TEXT DEFAULT NULL,
                capture_json TEXT DEFAULT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        # New ClaimLoop disputes table
        connection.execute("""
            CREATE TABLE IF NOT EXISTS disputes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_name TEXT NOT NULL,
                milestone_title TEXT NOT NULL,
                dispute_title TEXT NOT NULL,
                claimant_role TEXT NOT NULL,
                counterparty_name TEXT NOT NULL,
                disputed_amount REAL NOT NULL,
                currency TEXT NOT NULL DEFAULT 'INR',
                dispute_reason TEXT NOT NULL,
                claimant_statement TEXT NOT NULL,
                respondent_statement TEXT DEFAULT '',
                evidence_files TEXT NOT NULL DEFAULT '[]',
                status TEXT NOT NULL DEFAULT 'Open',
                analysis_json TEXT DEFAULT NULL,
                decision TEXT DEFAULT NULL,
                decision_notes TEXT DEFAULT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        connection.commit()


# ==========================================================
# EVIDENCE HISTORY FUNCTIONS — PRESERVED
# ==========================================================

def save_evidence_analysis(
    project_name,
    milestone_title,
    acceptance_criteria,
    evidence_filename,
    analysis,
):
    created_at = datetime.now(timezone.utc).isoformat()

    with get_connection() as connection:
        cursor = connection.execute("""
            INSERT INTO evidence_history (
                project_name,
                milestone_title,
                acceptance_criteria,
                evidence_filename,
                completion_score,
                overall_status,
                recommendation,
                analysis_json,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            project_name,
            milestone_title,
            acceptance_criteria,
            evidence_filename,
            analysis["completion_score"],
            analysis["overall_status"],
            analysis["recommendation"],
            json.dumps(analysis),
            created_at,
        ))

        connection.commit()
        return cursor.lastrowid


def get_evidence_history(limit=100):
    with get_connection() as connection:
        rows = connection.execute("""
            SELECT
                id,
                project_name,
                milestone_title,
                evidence_filename,
                completion_score,
                overall_status,
                recommendation,
                created_at
            FROM evidence_history
            ORDER BY id DESC
            LIMIT ?
        """, (limit,)).fetchall()

        return [dict(row) for row in rows]


def get_evidence_by_id(record_id):
    with get_connection() as connection:
        row = connection.execute("""
            SELECT *
            FROM evidence_history
            WHERE id = ?
        """, (record_id,)).fetchone()

        if row is None:
            return None

        record = dict(row)
        record["analysis"] = json.loads(record.pop("analysis_json"))
        return record


# ==========================================================
# CLAIMLOOP — DISPUTE MANAGEMENT
# ==========================================================

def create_dispute(
    project_name,
    milestone_title,
    dispute_title,
    claimant_role,
    counterparty_name,
    disputed_amount,
    currency,
    dispute_reason,
    claimant_statement,
    respondent_statement="",
    evidence_files=None,
):
    now = datetime.now(timezone.utc).isoformat()
    evidence_files = evidence_files or []

    with get_connection() as connection:
        cursor = connection.execute("""
            INSERT INTO disputes (
                project_name,
                milestone_title,
                dispute_title,
                claimant_role,
                counterparty_name,
                disputed_amount,
                currency,
                dispute_reason,
                claimant_statement,
                respondent_statement,
                evidence_files,
                status,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?)
        """, (
            project_name,
            milestone_title,
            dispute_title,
            claimant_role,
            counterparty_name,
            disputed_amount,
            currency,
            dispute_reason,
            claimant_statement,
            respondent_statement,
            json.dumps(evidence_files),
            now,
            now,
        ))

        connection.commit()
        return cursor.lastrowid


def get_disputes(limit=100):
    with get_connection() as connection:
        rows = connection.execute("""
            SELECT *
            FROM disputes
            ORDER BY id DESC
            LIMIT ?
        """, (limit,)).fetchall()

        results = []

        for row in rows:
            item = dict(row)
            item["evidence_files"] = json.loads(
                item["evidence_files"] or "[]"
            )
            item["analysis"] = (
                json.loads(item["analysis_json"])
                if item["analysis_json"] else None
            )
            item.pop("analysis_json", None)
            results.append(item)

        return results


def get_dispute_by_id(dispute_id):
    with get_connection() as connection:
        row = connection.execute("""
            SELECT *
            FROM disputes
            WHERE id = ?
        """, (dispute_id,)).fetchone()

        if row is None:
            return None

        item = dict(row)
        item["evidence_files"] = json.loads(
            item["evidence_files"] or "[]"
        )
        item["analysis"] = (
            json.loads(item["analysis_json"])
            if item["analysis_json"] else None
        )
        item.pop("analysis_json", None)

        return item


def save_dispute_analysis(dispute_id, analysis):
    now = datetime.now(timezone.utc).isoformat()

    with get_connection() as connection:
        cursor = connection.execute("""
            UPDATE disputes
            SET analysis_json = ?,
                status = 'Under Review',
                updated_at = ?
            WHERE id = ?
        """, (
            json.dumps(analysis),
            now,
            dispute_id,
        ))

        connection.commit()
        return cursor.rowcount > 0


def record_dispute_decision(
    dispute_id,
    decision,
    decision_notes,
):
    now = datetime.now(timezone.utc).isoformat()

    allowed_decisions = {
        "Resolved - Claimant",
        "Resolved - Respondent",
        "Request More Evidence",
        "Escalated",
    }

    if decision not in allowed_decisions:
        raise ValueError("Invalid dispute decision.")

    with get_connection() as connection:
        cursor = connection.execute("""
            UPDATE disputes
            SET decision = ?,
                decision_notes = ?,
                status = ?,
                updated_at = ?
            WHERE id = ?
        """, (
            decision,
            decision_notes,
            decision,
            now,
            dispute_id,
        ))

        connection.commit()
        return cursor.rowcount > 0
# ==========================================================
# PAYPAL — PAYMENT TRANSACTION HISTORY
# ==========================================================

def save_paypal_order(order_id, amount, currency, status, order_data=None):
    now = datetime.now(timezone.utc).isoformat()

    with get_connection() as connection:
        connection.execute("""
            INSERT INTO payment_transactions (
                paypal_order_id,
                amount,
                currency,
                status,
                order_json,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            order_id,
            str(amount),
            currency.upper(),
            status,
            json.dumps(order_data or {}),
            now,
            now,
        ))
        connection.commit()

    return get_paypal_payment(order_id)


def get_paypal_payment(order_id):
    with get_connection() as connection:
        row = connection.execute("""
            SELECT *
            FROM payment_transactions
            WHERE paypal_order_id = ?
        """, (order_id,)).fetchone()

        if row is None:
            return None

        record = dict(row)

        for field in ("order_json", "capture_json"):
            if record.get(field):
                record[field] = json.loads(record[field])

        return record


def update_paypal_capture(
    order_id,
    capture_id,
    status,
    capture_status,
    payer_email=None,
    capture_data=None,
):
    now = datetime.now(timezone.utc).isoformat()

    with get_connection() as connection:
        cursor = connection.execute("""
            UPDATE payment_transactions
            SET paypal_capture_id = ?,
                status = ?,
                capture_status = ?,
                payer_email = ?,
                capture_json = ?,
                updated_at = ?
            WHERE paypal_order_id = ?
        """, (
            capture_id,
            status,
            capture_status,
            payer_email,
            json.dumps(capture_data or {}),
            now,
            order_id,
        ))

        connection.commit()
        return cursor.rowcount > 0


def get_paypal_payment_history(limit=100):
    with get_connection() as connection:
        rows = connection.execute("""
            SELECT *
            FROM payment_transactions
            ORDER BY id DESC
            LIMIT ?
        """, (limit,)).fetchall()

        return [dict(row) for row in rows]