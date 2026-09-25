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
    async def get_rationale_for_case_tx(self, case_id: str, transaction_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch the cached AI release-rationale fields for a given case + transaction.
        Returns None if no verification record exists for that case/tx pair.
        """
        pass

    @abstractmethod
    async def set_rationale(
        self,
        case_id: str,
        transaction_id: str,
        status: str,
        rationale: Optional[str] = None,
        model: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Write the cached AI release-rationale fields (status/rationale/model/
        generated_at) onto the verification record matching case_id +
        transaction_id. Falls back to the most recent record for the case if
        transaction_id isn't already stored on it (back-compat with records
        created before transaction_id was tracked).
        """
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

    def _find_record_for_case_tx(self, case_id: str, transaction_id: str) -> Optional[Dict[str, Any]]:
        candidates = [r for r in self._records.values() if r.get("case_id") == case_id]
        if not candidates:
            return None
        for r in candidates:
            if r.get("transaction_id") == transaction_id:
                return r
        # Back-compat: no record has transaction_id set yet -- fall back to
        # the most recent verification for this case (today's 1:1 case<->tx
        # assumption for demo data).
        candidates.sort(key=lambda r: r.get("created_at", ""), reverse=True)
        return candidates[0]

    async def get_rationale_for_case_tx(self, case_id: str, transaction_id: str) -> Optional[Dict[str, Any]]:
        rec = self._find_record_for_case_tx(case_id, transaction_id)
        return copy.deepcopy(rec) if rec else None

    async def set_rationale(
        self,
        case_id: str,
        transaction_id: str,
        status: str,
        rationale: Optional[str] = None,
        model: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        rec = self._find_record_for_case_tx(case_id, transaction_id)
        if not rec:
            # No CustomerVerification record exists for this case at all
            # (e.g. a case that was frozen without going through the n8n
            # customer-verification flow). The rationale cache still needs
            # somewhere to live, so create a minimal placeholder record --
            # this is purely a cache row, not a verification lifecycle
            # record, and never claims a customer response happened.
            now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            rec = {
                "verification_id": f"RATIONALE-CACHE-{case_id}-{transaction_id}",
                "case_id": case_id,
                "event_id": f"RATIONALE-CACHE-{case_id}-{transaction_id}",
                "account_id": None,
                "demo_customer_email": "",
                "reason_summary": "",
                "trigger_pattern_ids": [],
                "verification_token": f"RATIONALE-CACHE-{case_id}-{transaction_id}",
                "token_expires_at": now_iso,
                "status": "NOT_TRIGGERED",
                "created_at": now_iso,
                "updated_at": now_iso,
            }
            self._records[rec["verification_id"]] = rec
        rec["transaction_id"] = transaction_id
        rec["suggested_rationale_status"] = status
        if rationale is not None:
            rec["suggested_release_rationale"] = rationale
        if model is not None:
            rec["suggested_rationale_model"] = model
        rec["suggested_rationale_generated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        rec["updated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        return copy.deepcopy(rec)

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
        "transaction_id": getattr(v, "transaction_id", None),
        "suggested_release_rationale": getattr(v, "suggested_release_rationale", None),
        "suggested_rationale_generated_at": v.suggested_rationale_generated_at.isoformat() if getattr(v, "suggested_rationale_generated_at", None) else None,
        "suggested_rationale_status": getattr(v, "suggested_rationale_status", None),
        "suggested_rationale_model": getattr(v, "suggested_rationale_model", None),
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
            transaction_id=record.get("transaction_id"),
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

    async def _find_obj_for_case_tx(self, case_id: str, transaction_id: str):
        from sqlalchemy import select
        from app.models.customer_verification import CustomerVerification

        result = await self.session.execute(
            select(CustomerVerification)
            .where(CustomerVerification.case_id == case_id)
            .order_by(CustomerVerification.created_at.desc())
        )
        candidates = result.scalars().all()
        if not candidates:
            return None
        for obj in candidates:
            if obj.transaction_id == transaction_id:
                return obj
        # Back-compat: fall back to most recent verification for this case.
        return candidates[0]

    async def get_rationale_for_case_tx(self, case_id: str, transaction_id: str) -> Optional[Dict[str, Any]]:
        obj = await self._find_obj_for_case_tx(case_id, transaction_id)
        return _verification_to_dict(obj) if obj else None

    async def set_rationale(
        self,
        case_id: str,
        transaction_id: str,
        status: str,
        rationale: Optional[str] = None,
        model: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        from app.models.customer_verification import CustomerVerification
        from uuid import uuid4

        obj = await self._find_obj_for_case_tx(case_id, transaction_id)
        if not obj:
            # No CustomerVerification record exists yet for this case (e.g.
            # frozen without going through the n8n customer-verification
            # flow) -- create a minimal placeholder row purely to host the
            # rationale cache. status=NOT_TRIGGERED makes clear no customer
            # response actually happened.
            placeholder_token = f"RATIONALE-CACHE-{uuid4().hex}"
            obj = CustomerVerification(
                verification_id=f"RATIONALE-CACHE-{uuid4().hex}",
                case_id=case_id,
                event_id=f"RATIONALE-CACHE-{uuid4().hex}",
                demo_customer_email="",
                reason_summary="",
                trigger_pattern_ids=[],
                verification_token=placeholder_token,
                token_expires_at=datetime.now(timezone.utc),
                status="NOT_TRIGGERED",
                transaction_id=transaction_id,
            )
            self.session.add(obj)
        obj.transaction_id = transaction_id
        obj.suggested_rationale_status = status
        if rationale is not None:
            obj.suggested_release_rationale = rationale
        if model is not None:
            obj.suggested_rationale_model = model
        obj.suggested_rationale_generated_at = datetime.now(timezone.utc)
        await self.session.flush()
        return _verification_to_dict(obj)

    async def commit_transaction(self) -> None:
        await self.session.commit()

    async def rollback_transaction(self) -> None:
        await self.session.rollback()
