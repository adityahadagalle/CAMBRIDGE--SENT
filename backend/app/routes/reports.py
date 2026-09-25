"""
SENTINEL Freeze / Unfreeze / Complete Case Report Routes.

Isolated, additive, READ-ONLY report module. Reads existing case, account,
transaction, and audit data and returns a formatted PDF. Never mutates any
state, never freezes/unfreezes an account, never touches n8n, and is
completely independent of the fraud-detection / policy / action-execution
pipeline.

Routes deliberately live under a distinct 3-segment path
(/cases/{case_id}/reports/{report_kind}/pdf) so they cannot collide with
the existing GET /cases/{case_id}/reports/{report_type} stage-report
endpoint in main.py (that one only ever matches a single path segment).
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import Response as FastAPIResponse

from app.services.report_service import (
    ReportDataError,
    build_freeze_report_data,
    build_unfreeze_report_data,
    build_complete_case_report_data,
)
from app.services.report_pdf import (
    render_freeze_report,
    render_unfreeze_report,
    render_complete_case_report,
)

logger = logging.getLogger("sentinel.reports")

router = APIRouter(prefix="/cases", tags=["Freeze/Unfreeze Reports"])

_UNABLE_MSG = "Unable to generate report. Existing case data was not modified."


def _pdf_response(pdf_bytes: bytes, filename: str) -> FastAPIResponse:
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{case_id}/reports/freeze/pdf")
async def download_freeze_report(
    case_id: str,
    account_id: Optional[str] = None,
    tx_id: Optional[str] = None,
) -> FastAPIResponse:
    try:
        data = build_freeze_report_data(case_id, account_id=account_id, tx_id=tx_id)
        pdf_bytes = render_freeze_report(data)
    except ReportDataError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"[ReportModule] Freeze report generation failed for case '{case_id}': {e}")
        raise HTTPException(status_code=500, detail=_UNABLE_MSG)

    return _pdf_response(pdf_bytes, f"SENTINEL_Freeze_Report_{case_id}.pdf")


@router.get("/{case_id}/reports/unfreeze/pdf")
async def download_unfreeze_report(
    case_id: str,
    account_id: Optional[str] = None,
    tx_id: Optional[str] = None,
) -> FastAPIResponse:
    try:
        data = build_unfreeze_report_data(case_id, account_id=account_id, tx_id=tx_id)
        pdf_bytes = render_unfreeze_report(data)
    except ReportDataError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"[ReportModule] Unfreeze report generation failed for case '{case_id}': {e}")
        raise HTTPException(status_code=500, detail=_UNABLE_MSG)

    return _pdf_response(pdf_bytes, f"SENTINEL_Unfreeze_Report_{case_id}.pdf")


@router.get("/{case_id}/reports/complete/pdf")
async def download_complete_case_report(
    case_id: str,
    account_id: Optional[str] = None,
) -> FastAPIResponse:
    try:
        data = build_complete_case_report_data(case_id, account_id=account_id)
        pdf_bytes = render_complete_case_report(data)
    except ReportDataError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"[ReportModule] Complete case report generation failed for case '{case_id}': {e}")
        raise HTTPException(status_code=500, detail=_UNABLE_MSG)

    return _pdf_response(pdf_bytes, f"SENTINEL_Complete_Case_Report_{case_id}.pdf")
