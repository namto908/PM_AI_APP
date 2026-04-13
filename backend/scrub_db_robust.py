import asyncio
import asyncpg

async def main():
    dsn = "postgresql://taskops:taskops_secret@localhost:5432/taskops_db"
    conn = await asyncpg.connect(dsn)
    try:
        # Get all table names in the current schema
        rows = await conn.fetch("""
            SELECT tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname != 'pg_catalog' 
            AND schemaname != 'information_schema';
        """)
        all_tables = [r['tablename'] for r in rows if r['tablename'] != 'alembic_version']
        
        if not all_tables:
            print("No tables found to clean.")
            return

        query = f"TRUNCATE TABLE {', '.join(all_tables)} CASCADE;"
        print(f"Cleaning tables: {', '.join(all_tables)}")
        await conn.execute(query)
        print("DATABASE_CLEANUP_SUCCESS")
        
        # Verify
        for table in all_tables:
            count = await conn.fetchval(f"SELECT COUNT(*) FROM {table}")
            print(f"- {table}: {count} rows")
            
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
