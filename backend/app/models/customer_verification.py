"""
CustomerVerification ORM Model for SENTINEL (n8n VerifyFlow Integration).

Persists the lifecycle of an automated customer verification request:
requested -> message sent -> customer response received -> completed.
The customer's response is stored as additional case evidence; it never
mutates Case.status or creates a Disposition row directly. Only a human
analyst submitting POST /cases/{case_id}/disposition can do that.
"""

from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, ForeignKey, CheckConstraint, Index, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base

# Dialect-compatible JSON type (matches audit_event.py's pattern)
JSONType = JSONB().with_variant(JSON(), "sqlite")

VALID_VERIFICATION_STATUSES = (
    "PENDING",
    "RESPONDED_YES",
    "RESPONDED_NO",
    "EXPIRED",
    "FAILED_TO_SEND",
)


class CustomerVerification(Base):
    __tablename__ = "customer_verifications"

    verification_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    case_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("cases.case_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    account_id: Mapped[str] = mapped_column(String(64), nullable=True)
    demo_customer_email: Mapped[str] = mapped_column(String(256), nullable=False)
    reason_summary: Mapped[str] = mapped_column(Text, nullable=False)
    trigger_pattern_ids: Mapped[list] = mapped_column(JSONType, nullable=False, default=list)
    verification_token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING", index=True)
    response_received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    response_source_ip: Mapped[str] = mapped_column(String(64), nullable=True)
    n8n_execution_id: Mapped[str] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING', 'RESPONDED_YES', 'RESPONDED_NO', 'EXPIRED', 'FAILED_TO_SEND')",
            name="chk_customer_verification_status",
        ),
        Index("idx_customer_verifications_case", "case_id"),
    )
