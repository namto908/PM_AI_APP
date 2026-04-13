import asyncio
import asyncpg

async def main():
    dsn = "postgresql://taskops:taskops_secret@localhost:5432/taskops_db"
    conn = await asyncpg.connect(dsn)
    try:
        tables = [
            "group_members", "groups", "task_activities", 
            "task_comments", "tasks", "projects", 
            "workspace_members", "workspaces", "users"
        ]
        query = f"TRUNCATE TABLE {', '.join(tables)} CASCADE;"
        await conn.execute(query)
        print("DATABASE_CLEANUP_SUCCESS")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
