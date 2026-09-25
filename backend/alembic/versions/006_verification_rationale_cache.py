"""Cached AI release rationale fields on customer_verifications

Revision ID: 006_verification_rationale_cache
Revises: 005_customer_verifications
Create Date: 2026-09-25 00:00:00.000000

Adds persistence for the AI-suggested release rationale so it can be
generated once in the background (triggered by the customer YES webhook)
and served instantly to the analyst's release modal instead of being
regenerated synchronously on every modal open.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '006_verification_rationale_cache'
down_revision: Union[str, None] = '005_customer_verifications'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('chk_customer_verification_status', 'customer_verifications', type_='check')
    op.create_check_constraint(
        'chk_customer_verification_status',
        'customer_verifications',
        "status IN ('PENDING', 'RESPONDED_YES', 'RESPONDED_NO', 'EXPIRED', 'FAILED_TO_SEND', 'NOT_TRIGGERED')",
    )
    op.add_column('customer_verifications', sa.Column('transaction_id', sa.String(length=64), nullable=True))
    op.add_column('customer_verifications', sa.Column('suggested_release_rationale', sa.Text(), nullable=True))
    op.add_column('customer_verifications', sa.Column('suggested_rationale_generated_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('customer_verifications', sa.Column('suggested_rationale_status', sa.String(length=32), nullable=True))
    op.add_column('customer_verifications', sa.Column('suggested_rationale_model', sa.String(length=128), nullable=True))
    op.create_index('idx_customer_verifications_tx', 'customer_verifications', ['transaction_id'])


def downgrade() -> None:
    op.drop_index('idx_customer_verifications_tx', table_name='customer_verifications')
    op.drop_column('customer_verifications', 'suggested_rationale_model')
    op.drop_column('customer_verifications', 'suggested_rationale_status')
    op.drop_column('customer_verifications', 'suggested_rationale_generated_at')
    op.drop_column('customer_verifications', 'suggested_release_rationale')
    op.drop_column('customer_verifications', 'transaction_id')
    op.drop_constraint('chk_customer_verification_status', 'customer_verifications', type_='check')
    op.create_check_constraint(
        'chk_customer_verification_status',
        'customer_verifications',
        "status IN ('PENDING', 'RESPONDED_YES', 'RESPONDED_NO', 'EXPIRED', 'FAILED_TO_SEND')",
    )
