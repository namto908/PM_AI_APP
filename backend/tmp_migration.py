import os
from sqlalchemy import create_engine
from sqlalchemy.sql import text

def migrate():
    # Try localhost first (for development/host running)
    urls = [
        'postgresql://taskops:taskops_secret@localhost:5432/taskops_db',
        'postgresql://taskops:taskops_secret@postgres:5432/taskops_db'
    ]
    
    success = False
    for url in urls:
        try:
            print(f"Trying to connect to {url}...")
            engine = create_engine(url)
            with engine.connect() as conn:
                # 1. Delete cancelled tasks
                print("Deleting tasks with status='cancelled'...")
                conn.execute(text("DELETE FROM tasks WHERE status = 'cancelled'"))
                
                # 2. Add is_deleted column
                print("Adding is_deleted column...")
                conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE"))
                
                # 3. Handle activity logs that might be orphaned or need cleanup?
                # Actually CASCADE should handle it, but we already have the col.
                
                conn.commit()
                print("Migration successful")
                success = True
                break
        except Exception as e:
            print(f"Failed to connect to {url}: {e}")
            
    if not success:
        print("Could not connect to database.")
        exit(1)

if __name__ == "__main__":
    migrate()
