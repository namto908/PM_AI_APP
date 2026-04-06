import os
import glob
import re

files_to_check = [
    "backend/app/work/models.py",
    "backend/app/work/repository.py",
    "backend/app/ops/service.py",
    "backend/app/ops/models.py",
    "backend/app/ai/tools/monitoring_tools.py",
    "backend/app/ai/models.py",
    "backend/app/auth/service.py",
    "backend/app/auth/models.py"
]

for file_path in files_to_check:
    if not os.path.exists(file_path):
        continue
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    if "datetime.utcnow" in content:
        # replace datetime.utcnow with datetime.now(timezone.utc)
        # Note: if it's default=datetime.utcnow, we need a lambda or pass timezone.utc
        # Actually sqlalchemy supports default=lambda: datetime.now(timezone.utc)
        
        # Add import if needed
        if "from datetime import timezone" not in content and "import timezone" not in content:
            content = content.replace("from datetime import datetime", "from datetime import datetime, timezone")
            
        content = content.replace("default=datetime.utcnow", "default=lambda: datetime.now(timezone.utc)")
        content = content.replace("datetime.utcnow()", "datetime.now(timezone.utc)")
        content = content.replace("datetime.utcnow", "lambda: datetime.now(timezone.utc)") # catch any remaining defaults

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed {file_path}")

