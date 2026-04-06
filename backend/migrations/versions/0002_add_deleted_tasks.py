"""add deleted_tasks

Revision ID: 0002_add_deleted_tasks
Revises: 0001_initial
Create Date: 2026-04-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0002_add_deleted_tasks'
down_revision = '0001_initial'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'deleted_tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('parent_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), nullable=True),
        sa.Column('priority', sa.String(10), nullable=True),
        sa.Column('assignee_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('due_date', sa.Date, nullable=True),
        sa.Column('position', sa.Integer, nullable=True),
        sa.Column('tags', postgresql.ARRAY(sa.String), nullable=True),
        sa.Column('metadata', postgresql.JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
        sa.Column('deleted_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_deleted_tasks_workspace_id', 'deleted_tasks', ['workspace_id'])
    op.create_index('ix_deleted_tasks_project_id', 'deleted_tasks', ['project_id'])

def downgrade() -> None:
    op.drop_table('deleted_tasks')
