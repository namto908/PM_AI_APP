"""initial

Revision ID: 0001_initial
Revises: 
Create Date: 2025-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- users ---
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.Text, nullable=False),
        sa.Column('avatar_url', sa.Text, nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # --- workspaces ---
    op.create_table(
        'workspaces',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_workspaces_slug', 'workspaces', ['slug'], unique=True)

    # --- workspace_members ---
    op.create_table(
        'workspace_members',
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('joined_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )

    # --- projects ---
    op.create_table(
        'projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('color', sa.String(7), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_projects_workspace_id', 'projects', ['workspace_id'])

    # --- tasks ---
    op.create_table(
        'tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='SET NULL'), nullable=True),
        sa.Column('parent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='todo'),
        sa.Column('priority', sa.String(10), nullable=False, server_default='medium'),
        sa.Column('assignee_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('due_date', sa.Date, nullable=True),
        sa.Column('position', sa.Integer, nullable=False, server_default='0'),
        sa.Column('tags', postgresql.ARRAY(sa.String), nullable=True, server_default='{}'),
        sa.Column('metadata', postgresql.JSONB, nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_tasks_workspace_id', 'tasks', ['workspace_id'])
    op.create_index('ix_tasks_project_id', 'tasks', ['project_id'])
    op.create_index('ix_tasks_status', 'tasks', ['status'])
    op.create_index('ix_tasks_assignee_id', 'tasks', ['assignee_id'])

    # --- task_comments ---
    op.create_table(
        'task_comments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_task_comments_task_id', 'task_comments', ['task_id'])

    # --- task_activities ---
    op.create_table(
        'task_activities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('old_value', postgresql.JSONB, nullable=True),
        sa.Column('new_value', postgresql.JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_task_activities_task_id', 'task_activities', ['task_id'])

    # --- ai_conversations ---
    op.create_table(
        'ai_conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('context_snapshot', postgresql.JSONB, nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_ai_conversations_workspace_id', 'ai_conversations', ['workspace_id'])

    # --- ai_messages ---
    op.create_table(
        'ai_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ai_conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(10), nullable=False),
        sa.Column('content', sa.Text, nullable=True),
        sa.Column('tool_name', sa.String(100), nullable=True),
        sa.Column('tool_calls', postgresql.JSONB, nullable=True),
        sa.Column('token_usage_input', sa.Integer, nullable=True),
        sa.Column('token_usage_output', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_ai_messages_conversation_id', 'ai_messages', ['conversation_id'])

    # --- servers ---
    op.create_table(
        'servers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('hostname', sa.String(255), nullable=True),
        sa.Column('ip_address', postgresql.INET, nullable=True),
        sa.Column('environment', sa.String(20), nullable=False, server_default='production'),
        sa.Column('agent_token', sa.Text, nullable=True),
        sa.Column('tags', postgresql.ARRAY(sa.String), nullable=True, server_default='{}'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_servers_workspace_id', 'servers', ['workspace_id'])
    op.create_index('ix_servers_agent_token', 'servers', ['agent_token'], unique=True)

    # --- services ---
    op.create_table(
        'services',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('server_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('servers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('port', sa.Integer, nullable=True),
        sa.Column('check_type', sa.String(20), nullable=False, server_default='http'),
        sa.Column('check_target', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='unknown'),
        sa.Column('last_checked_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_services_server_id', 'services', ['server_id'])

    # --- server_metrics (TimescaleDB hypertable) ---
    op.create_table(
        'server_metrics',
        sa.Column('time', sa.TIMESTAMP(timezone=True), nullable=False, primary_key=True),
        sa.Column('server_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('servers.id', ondelete='CASCADE'), nullable=False, primary_key=True),
        sa.Column('cpu_percent', sa.Numeric(5, 2), nullable=True),
        sa.Column('ram_percent', sa.Numeric(5, 2), nullable=True),
        sa.Column('ram_used_mb', sa.Integer, nullable=True),
        sa.Column('ram_total_mb', sa.Integer, nullable=True),
        sa.Column('disk_percent', sa.Numeric(5, 2), nullable=True),
        sa.Column('load_1m', sa.Numeric(6, 3), nullable=True),
        sa.Column('load_5m', sa.Numeric(6, 3), nullable=True),
        sa.Column('load_15m', sa.Numeric(6, 3), nullable=True),
        sa.Column('net_in_kbps', sa.Integer, nullable=True),
        sa.Column('net_out_kbps', sa.Integer, nullable=True),
    )
    # Convert to TimescaleDB hypertable
    op.execute("SELECT create_hypertable('server_metrics', 'time')")

    # --- alerts ---
    op.create_table(
        'alerts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('server_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('servers.id', ondelete='SET NULL'), nullable=True),
        sa.Column('service_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('services.id', ondelete='SET NULL'), nullable=True),
        sa.Column('severity', sa.String(10), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text, nullable=True),
        sa.Column('metric_name', sa.String(50), nullable=True),
        sa.Column('metric_value', sa.Numeric(10, 3), nullable=True),
        sa.Column('threshold', sa.Numeric(10, 3), nullable=True),
        sa.Column('payload', postgresql.JSONB, nullable=True, server_default='{}'),
        sa.Column('resolved', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('resolved_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('resolved_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_alerts_workspace_id', 'alerts', ['workspace_id'])
    op.create_index('ix_alerts_resolved', 'alerts', ['resolved'])

    # --- alert_rules ---
    op.create_table(
        'alert_rules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('server_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('servers.id', ondelete='CASCADE'), nullable=True),
        sa.Column('service_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('services.id', ondelete='CASCADE'), nullable=True),
        sa.Column('metric_name', sa.String(50), nullable=False),
        sa.Column('operator', sa.String(5), nullable=False),
        sa.Column('threshold', sa.Numeric(10, 3), nullable=False),
        sa.Column('duration_min', sa.Integer, nullable=False, server_default='5'),
        sa.Column('severity', sa.String(10), nullable=False, server_default='warning'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_alert_rules_workspace_id', 'alert_rules', ['workspace_id'])


def downgrade() -> None:
    op.drop_table('alert_rules')
    op.drop_table('alerts')
    op.drop_table('server_metrics')
    op.drop_table('services')
    op.drop_table('servers')
    op.drop_table('ai_messages')
    op.drop_table('ai_conversations')
    op.drop_table('task_activities')
    op.drop_table('task_comments')
    op.drop_table('tasks')
    op.drop_table('projects')
    op.drop_table('workspace_members')
    op.drop_table('workspaces')
    op.drop_table('users')
