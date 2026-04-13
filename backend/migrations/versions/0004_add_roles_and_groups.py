"""add system_role to users and groups/group_members tables

Revision ID: 0004_add_roles_and_groups
Revises: 0003_add_archive_reason
Create Date: 2026-04-13 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '0004_add_roles_and_groups'
down_revision = '0003_add_archive_reason'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add system_role column to users (default 'employee')
    op.add_column(
        'users',
        sa.Column('system_role', sa.String(length=20), nullable=False, server_default='employee'),
    )

    # Normalise existing workspace_member roles: admin→manager, member→employee, viewer→guest
    op.execute(
        "UPDATE workspace_members SET role = 'manager' WHERE role = 'admin'"
    )
    op.execute(
        "UPDATE workspace_members SET role = 'employee' WHERE role = 'member'"
    )
    op.execute(
        "UPDATE workspace_members SET role = 'guest' WHERE role = 'viewer'"
    )

    # Create groups table
    op.create_table(
        'groups',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )

    # Create group_members table
    op.create_table(
        'group_members',
        sa.Column('group_id', UUID(as_uuid=True), sa.ForeignKey('groups.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('joined_at', sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('group_members')
    op.drop_table('groups')
    op.execute(
        "UPDATE workspace_members SET role = 'admin' WHERE role = 'manager'"
    )
    op.execute(
        "UPDATE workspace_members SET role = 'member' WHERE role = 'employee'"
    )
    op.execute(
        "UPDATE workspace_members SET role = 'viewer' WHERE role = 'guest'"
    )
    op.drop_column('users', 'system_role')
