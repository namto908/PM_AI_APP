"""add archive_reason to deleted_tasks

Revision ID: 0003_add_archive_reason
Revises: 0002_add_deleted_tasks
Create Date: 2026-04-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '0003_add_archive_reason'
down_revision = '0002_add_deleted_tasks'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('deleted_tasks', sa.Column('archive_reason', sa.String(length=20), nullable=True))

def downgrade() -> None:
    op.drop_column('deleted_tasks', 'archive_reason')
