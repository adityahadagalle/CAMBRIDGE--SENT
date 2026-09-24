"""Customer Verifications Table for n8n VerifyFlow Integration

Revision ID: 005_customer_verifications
Revises: 004_active_inv_unique_idx
Create Date: 2026-09-24 00:00:00.000000

Creates persistence for automated customer-verification requests (SENTINEL --
VerifyFlow n8n workflow). The customer's YES/NO response is stored here as
additional case evidence only -- it never mutates cases.status or creates a
dispositions row. Only a human analyst via POST /cases/{case_id}/disposition
can change case disposition.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = '005_customer_verifications'
down_revision: Union[str, None] = '004_active_inv_unique_idx'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Dialect-compatible JSON type
JSONType = sa.JSON().with_variant(JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        'customer_verifications',
        sa.Column('verification_id', sa.String(length=64), nullable=False),
        sa.Column('case_id', sa.String(length=64), nullable=False),
        sa.Column('event_id', sa.String(length=128), nullable=False),
        sa.Column('account_id', sa.String(length=64), nullable=True),
        sa.Column('demo_customer_email', sa.String(length=256), nullable=False),
        sa.Column('reason_summary', sa.Text(), nullable=False),
        sa.Column('trigger_pattern_ids', JSONType, nullable=False, server_default='[]'),
        sa.Column('verification_token', sa.String(length=128), nullable=False),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='PENDING'),
        sa.Column('response_received_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('response_source_ip', sa.String(length=64), nullable=True),
        sa.Column('n8n_execution_id', sa.String(length=128), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('PENDING', 'RESPONDED_YES', 'RESPONDED_NO', 'EXPIRED', 'FAILED_TO_SEND')",
            name='chk_customer_verification_status'
        ),
        sa.ForeignKeyConstraint(['case_id'], ['cases.case_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('verification_id'),
        sa.UniqueConstraint('event_id', name='uq_customer_verifications_event_id'),
        sa.UniqueConstraint('verification_token', name='uq_customer_verifications_token'),
    )
    op.create_index('idx_customer_verifications_case', 'customer_verifications', ['case_id'])
    op.create_index('idx_customer_verifications_status', 'customer_verifications', ['status'])


def downgrade() -> None:
    op.drop_index('idx_customer_verifications_status', table_name='customer_verifications')
    op.drop_index('idx_customer_verifications_case', table_name='customer_verifications')
    op.drop_table('customer_verifications')
