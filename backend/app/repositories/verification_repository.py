"""
Abstract + concrete repositories for CustomerVerification persistence
(SENTINEL -- VerifyFlow n8n integration).

Kept as its own small interface rather than folded into AbstractCaseRepository:
verification records are a narrow, self-contained lifecycle (requested ->
message sent -> customer responded / expired) that doesn't need the 18-method
case/disposition/audit surface. Both InMemory and PostgreSQL implementations
work with plain dict records, matching the existing AbstractCaseRepository
convention.
"""

import copy
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


class AbstractVerificationRepository(ABC):
    """Abstract contract for customer-verification persistence operations."""

    @abstractmethod
    async def create_verification(self, record: Dict[str, Any]) -> bool:
        """Persists a new PENDING verification record."""
        pass

    @abstractmethod
    async def get_by_event_id(self, case_id: str, event_id: str) -> Optional[Dict[str, Any]]:
        """Idempotency lookup: existing verification for this case_id + event_id, if any."""
        pass

    @abstractmethod
    async def get_by_token(self, verification_token: str) -> Optional[Dict[str, Any]]:
        """Lookup a verification record by its single-use response token."""
        pass

    @abstractmethod
    async def mark_responded(
        self,
        verification_token: str,
        decision: str,
        responded_at: datetime,
        source_ip: Optional[str] = None,
        n8n_execution_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Marks a PENDING verification as RESPONDED_YES/RESPONDED_NO.
        Returns the updated record, or None if the token doesn't exist.
        No-op (returns the record unchanged) if already responded -- idempotent.
        """
        pass

    @abstractmethod
    async def get_for_case(self, case_id: str) -> List[Dict[str, Any]]:
        """All verification records for a case, most recent first."""
        pass

    @abstractmethod
    async def commit_transaction(self) -> None:
        pass

    @abstractmethod
    async def rollback_transaction(self) -> None:
        pass


class InMemoryVerificationRepository(AbstractVerificationRepository):
    """In-memory implementation for dev/test mode, backed by the shared data_store dict."""

    def __init__(self, store: Optional[Dict[str, Any]] = None):
        self._records: Dict[str, Dict[str, Any]] = {}
        if store is not None:
            self._records = store.setdefault("customer_verifications", {})

    async def create_verification(self, record: Dict[str, Any]) -> bool:
        self._records[record["verification_id"]] = copy.deepcopy(record)
        return True

    async def get_by_event_id(self, case_id: str, event_id: str) -> Optional[Dict[str, Any]]:
        for rec in self._records.values():
            if rec.get("case_id") == case_id and rec.get("event_id") == event_id:
                return copy.deepcopy(rec)
        return None

    async def get_by_token(self, verification_token: str) -> Optional[Dict[str, Any]]:
        for rec in self._records.values():
            if rec.get("verification_token") == verification_token:
                return copy.deepcopy(rec)
        return None

    async def mark_responded(
        self,
        verification_token: str,
        decision: str,
        responded_at: datetime,
        source_ip: Optional[str] = None,
        n8n_execution_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        for rec in self._records.values():
            if rec.get("verification_token") == verification_token:
                if rec.get("status") == "PENDING":
                    rec["status"] = decision
                    rec["response_received_at"] = responded_at.isoformat().replace("+00:00", "Z")
                    rec["response_source_ip"] = source_ip
                    if n8n_execution_id:
                        rec["n8n_execution_id"] = n8n_execution_id
                    rec["updated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                return copy.deepcopy(rec)
        return None

    async def get_for_case(self, case_id: str) -> List[Dict[str, Any]]:
        recs = [copy.deepcopy(r) for r in self._records.values() if r.get("case_id") == case_id]
        recs.sort(key=lambda r: r.get("created_at", ""), reverse=True)
        return recs

    async def commit_transaction(self) -> None:
        pass

    async def rollback_transaction(self) -> None:
        pass


def _verification_to_dict(v) -> Dict[str, Any]:
    return {
        "verification_id": v.verification_id,
        "case_id": v.case_id,
        "event_id": v.event_id,
        "account_id": v.account_id,
        "demo_customer_email": v.demo_customer_email,
        "reason_summary": v.reason_summary,
        "trigger_pattern_ids": v.trigger_pattern_ids or [],
        "verification_token": v.verification_token,
        "token_expires_at": v.token_expires_at.isoformat() if v.token_expires_at else None,
        "status": v.status,
        "response_received_at": v.response_received_at.isoformat() if v.response_received_at else None,
        "response_source_ip": v.response_source_ip,
        "n8n_execution_id": v.n8n_execution_id,
        "created_at": v.created_at.isoformat() if v.created_at else None,
        "updated_at": v.updated_at.isoformat() if v.updated_at else None,
    }


class PostgreSQLVerificationRepository(AbstractVerificationRepository):
    """PostgreSQL implementation backed by the CustomerVerification ORM model."""

    def __init__(self, session):
        self.session = session

    async def create_verification(self, record: Dict[str, Any]) -> bool:
        from app.models.customer_verification import CustomerVerification

        obj = CustomerVerification(
            verification_id=record["verification_id"],
            case_id=record["case_id"],
            event_id=record["event_id"],
            account_id=record.get("account_id"),
            demo_customer_email=record["demo_customer_email"],
            reason_summary=record["reason_summary"],
            trigger_pattern_ids=record.get("trigger_pattern_ids", []),
            verification_token=record["verification_token"],
            token_expires_at=record["token_expires_at"],
            status=record.get("status", "PENDING"),
        )
        self.session.add(obj)
        await self.session.flush()
        return True

    async def get_by_event_id(self, case_id: str, event_id: str) -> Optional[Dict[str, Any]]:
        from sqlalchemy import select
        from app.models.customer_verification import CustomerVerification

        result = await self.session.execute(
            select(CustomerVerification).where(
                CustomerVerification.case_id == case_id,
                CustomerVerification.event_id == event_id,
            )
        )
        obj = result.scalar_one_or_none()
        return _verification_to_dict(obj) if obj else None

    async def get_by_token(self, verification_token: str) -> Optional[Dict[str, Any]]:
        from sqlalchemy import select
        from app.models.customer_verification import CustomerVerification

        result = await self.session.execute(
            select(CustomerVerification).where(
                CustomerVerification.verification_token == verification_token
            )
        )
        obj = result.scalar_one_or_none()
        return _verification_to_dict(obj) if obj else None

    async def mark_responded(
        self,
        verification_token: str,
        decision: str,
        responded_at: datetime,
        source_ip: Optional[str] = None,
        n8n_execution_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        from sqlalchemy import select
        from app.models.customer_verification import CustomerVerification

        result = await self.session.execute(
            select(CustomerVerification).where(
                CustomerVerification.verification_token == verification_token
            )
        )
        obj = result.scalar_one_or_none()
        if not obj:
            return None
        if obj.status == "PENDING":
            obj.status = decision
            obj.response_received_at = responded_at
            obj.response_source_ip = source_ip
            if n8n_execution_id:
                obj.n8n_execution_id = n8n_execution_id
            await self.session.flush()
        return _verification_to_dict(obj)

    async def get_for_case(self, case_id: str) -> List[Dict[str, Any]]:
        from sqlalchemy import select
        from app.models.customer_verification import CustomerVerification

        result = await self.session.execute(
            select(CustomerVerification)
            .where(CustomerVerification.case_id == case_id)
            .order_by(CustomerVerification.created_at.desc())
        )
        return [_verification_to_dict(o) for o in result.scalars().all()]

    async def commit_transaction(self) -> None:
        await self.session.commit()

    async def rollback_transaction(self) -> None:
        await self.session.rollback()
