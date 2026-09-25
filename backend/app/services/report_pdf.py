"""
SENTINEL Report PDF Renderer.

Pure formatting layer: takes the plain dicts produced by
app.services.report_service and renders them into a professional-looking
PDF. Contains no fraud-detection, audit, or state-mutation logic -- it only
reads the dict it is given and writes bytes out.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fpdf import FPDF

_NAVY = (15, 23, 42)
_SLATE = (71, 85, 105)
_ACCENT = (37, 99, 235)
_LIGHT = (241, 245, 249)
_BORDER = (203, 213, 225)


class _SentinelPDF(FPDF):
    def __init__(self, subtitle: str) -> None:
        super().__init__(orientation="P", unit="mm", format="A4")
        self._subtitle = subtitle
        self.set_auto_page_break(auto=True, margin=18)

    def header(self) -> None:  # noqa: D102 (fpdf hook)
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*_NAVY)
        self.cell(0, 8, "SENTINEL", ln=1)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*_SLATE)
        self.cell(0, 5, "Financial Crime & Fraud Intelligence Platform", ln=1)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*_ACCENT)
        self.cell(0, 7, self._subtitle, ln=1)
        self.set_draw_color(*_BORDER)
        self.line(10, self.get_y() + 1, 200, self.get_y() + 1)
        self.ln(6)

    def footer(self) -> None:  # noqa: D102 (fpdf hook)
        self.set_y(-15)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(*_SLATE)
        self.cell(0, 10, f"SENTINEL Investigation Record - Page {self.page_no()}", align="C")


def _clean(text: Any) -> str:
    if text is None:
        return "Not available"
    return str(text).encode("latin-1", "replace").decode("latin-1")


def _section_title(pdf: _SentinelPDF, title: str) -> None:
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*_NAVY)
    pdf.set_fill_color(*_LIGHT)
    pdf.cell(0, 8, f"  {title}", ln=1, fill=True)
    pdf.ln(1)


def _kv_table(pdf: _SentinelPDF, rows: List[tuple]) -> None:
    # Label and value are rendered on separate lines (rather than the value
    # continuing on the same line as the label) so a long value can safely
    # wrap across a page break without depending on fpdf2 restoring a
    # mid-line x-offset after the automatic page-break header runs.
    for label, value in rows:
        pdf.set_text_color(*_SLATE)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(0, 6, _clean(label), ln=1)
        pdf.set_text_color(*_NAVY)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(0, 6, _clean(value))
    pdf.ln(2)


def _data_table(pdf: _SentinelPDF, headers: List[str], rows: List[List[Any]], col_widths: Optional[List[int]] = None) -> None:
    if not rows:
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(*_SLATE)
        pdf.cell(0, 6, "Not available", ln=1)
        pdf.ln(2)
        return

    n = len(headers)
    widths = col_widths or [int(180 / n)] * n

    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(*_LIGHT)
    pdf.set_text_color(*_NAVY)
    for h, w in zip(headers, widths):
        pdf.cell(w, 7, _clean(h), border=1, fill=True)
    pdf.ln()

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*_SLATE)
    for row in rows:
        for val, w in zip(row, widths):
            pdf.cell(w, 6, _clean(val)[:60], border=1)
        pdf.ln()
    pdf.ln(3)


def _bullet_list(pdf: _SentinelPDF, items: List[str]) -> None:
    if not items:
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(*_SLATE)
        pdf.cell(0, 6, "Not available", ln=1)
        pdf.ln(2)
        return
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*_NAVY)
    for item in items:
        text = _clean(item)
        if len(text) > 300:
            text = text[:297] + "..."
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(0, 6, f"- {text}")
    pdf.ln(2)


def render_freeze_report(data: Dict[str, Any]) -> bytes:
    pdf = _SentinelPDF("Account Freeze Report")
    pdf.add_page()

    _section_title(pdf, "Case & Account Information")
    _kv_table(pdf, [
        ("Case ID", data.get("case_id")),
        ("Account ID", data.get("account_id")),
        ("Transaction ID(s)", ", ".join(str(t) for t in data.get("transaction_ids") or []) or None),
        ("Current Account Status", data.get("current_account_status")),
    ])

    _section_title(pdf, "Freeze Event")
    _kv_table(pdf, [
        ("Freeze Date/Time", data.get("freeze_datetime")),
        ("Risk Score", data.get("risk_score")),
        ("Risk Level", data.get("risk_level")),
        ("Reason for Freeze", data.get("reason_for_freeze")),
        ("Policy Rule ID", data.get("policy_rule_id")),
        ("Action Taken", data.get("action_taken")),
        ("Analyst / Approver", data.get("analyst_id")),
        ("Analyst Role", data.get("analyst_role")),
        ("Audit Record ID", data.get("audit_id")),
    ])

    _section_title(pdf, "Investigation Findings")
    _kv_table(pdf, [
        ("Regulatory Severity", data.get("regulatory_severity")),
        ("Review Priority", data.get("review_priority")),
        ("Executive Summary", data.get("investigation_summary")),
    ])
    _bullet_list(pdf, data.get("evidence_signals") or [])

    _section_title(pdf, "Relevant Transactions")
    _data_table(
        pdf,
        ["Tx ID", "Amount", "Channel", "Risk", "Sender", "Receiver"],
        [[t.get("tx_id"), t.get("amount"), t.get("channel"), t.get("risk_score"), t.get("sender_account"), t.get("receiver_account")] for t in data.get("transactions") or []],
        col_widths=[30, 22, 22, 16, 45, 45],
    )

    _section_title(pdf, "Related Accounts / Graph Information")
    _data_table(
        pdf,
        ["Account ID", "Type", "Status"],
        [[a.get("account_id"), a.get("account_type"), a.get("status")] for a in data.get("related_accounts") or []],
        col_widths=[70, 55, 55],
    )

    _footer_generated(pdf, data)
    return bytes(pdf.output())


def render_unfreeze_report(data: Dict[str, Any]) -> bytes:
    pdf = _SentinelPDF("Account Unfreeze Report")
    pdf.add_page()

    _section_title(pdf, "Case & Account Information")
    _kv_table(pdf, [
        ("Case ID", data.get("case_id")),
        ("Account ID", data.get("account_id")),
        ("Transaction ID(s)", ", ".join(str(t) for t in data.get("transaction_ids") or []) or None),
        ("Current Account Status", data.get("current_account_status")),
    ])

    _section_title(pdf, "Unfreeze Event")
    _kv_table(pdf, [
        ("Original Freeze Date/Time", data.get("original_freeze_datetime")),
        ("Unfreeze Date/Time", data.get("unfreeze_datetime")),
        ("Duration of Restriction", data.get("duration_frozen")),
        ("Reason for Unfreezing", data.get("reason_for_unfreezing")),
        ("Original Risk Score", data.get("original_risk_score")),
        ("Analyst / Approver", data.get("analyst_id")),
        ("Analyst Role", data.get("analyst_role")),
        ("Audit Record ID", data.get("audit_id")),
    ])

    _section_title(pdf, "Investigation Summary")
    _kv_table(pdf, [
        ("Executive Summary", data.get("investigation_summary")),
    ])

    _section_title(pdf, "Complete Relevant Action History")
    _data_table(
        pdf,
        ["Action", "Actor", "Timestamp", "Reason"],
        [[a.get("action_code"), a.get("actor"), a.get("timestamp"), a.get("reason")] for a in data.get("action_history") or []],
        col_widths=[30, 35, 45, 70],
    )

    _footer_generated(pdf, data)
    return bytes(pdf.output())


def render_complete_case_report(data: Dict[str, Any]) -> bytes:
    pdf = _SentinelPDF("Complete Case Report")
    pdf.add_page()

    _section_title(pdf, "Case Summary")
    _kv_table(pdf, [
        ("Case ID", data.get("case_id")),
        ("Final Case Status", data.get("final_case_status")),
        ("Risk Level", data.get("risk_level")),
        ("Total Fraud Amount", data.get("total_fraud_amount")),
        ("Recoverable Amount", data.get("recoverable_amount")),
        ("Primary Transaction ID", data.get("primary_tx_id")),
    ])

    _section_title(pdf, "Investigation Summary")
    _kv_table(pdf, [
        ("Regulatory Severity", data.get("regulatory_severity")),
        ("Review Priority", data.get("review_priority")),
        ("Recommended Action", data.get("recommended_action")),
        ("Executive Summary", data.get("investigation_summary")),
    ])
    _bullet_list(pdf, data.get("evidence_signals") or [])

    _section_title(pdf, "Relevant Transactions")
    _data_table(
        pdf,
        ["Tx ID", "Amount", "Channel", "Risk", "Sender", "Receiver"],
        [[t.get("tx_id"), t.get("amount"), t.get("channel"), t.get("risk_score"), t.get("sender_account"), t.get("receiver_account")] for t in data.get("transactions") or []],
        col_widths=[30, 22, 22, 16, 45, 45],
    )

    _section_title(pdf, "Freeze Events")
    _data_table(
        pdf,
        ["Account ID", "Timestamp", "Analyst", "Reason"],
        [[e.get("account_id"), e.get("timestamp"), e.get("analyst_id"), e.get("reason")] for e in data.get("freeze_events") or []],
        col_widths=[40, 45, 35, 60],
    )

    _section_title(pdf, "Release / Unfreeze Events")
    _data_table(
        pdf,
        ["Account ID", "Timestamp", "Analyst", "Reason"],
        [[e.get("account_id"), e.get("timestamp"), e.get("analyst_id"), e.get("reason")] for e in data.get("release_events") or []],
        col_widths=[40, 45, 35, 60],
    )

    _section_title(pdf, "Complete Audit History")
    _data_table(
        pdf,
        ["Action", "Actor", "Timestamp", "Reason"],
        [[e.get("action_code"), e.get("actor"), e.get("timestamp"), e.get("reason")] for e in data.get("audit_history") or []],
        col_widths=[30, 35, 45, 70],
    )

    _footer_generated(pdf, data)
    return bytes(pdf.output())


def _footer_generated(pdf: _SentinelPDF, data: Dict[str, Any]) -> None:
    pdf.ln(2)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(*_SLATE)
    pdf.multi_cell(0, 5, f"Report generated at {_clean(data.get('generated_at'))}. Generated from existing SENTINEL case, audit, and investigation records. This report is read-only and does not modify case, account, or audit data.")
