from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.common.config import settings
from app.auth.router import router as auth_router
from app.auth.group_router import router as group_router
from app.auth.admin_router import router as admin_router
from app.work.router import router as work_router
from app.ops.router import router as ops_router
from app.ai.router import router as ai_router

app = FastAPI(
    title="TaskOps AI",
    version="0.1.0",
    docs_url="/docs" if settings.APP_DEBUG else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(group_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(work_router, prefix="/api/v1")
app.include_router(ops_router, prefix="/api/v1")
app.include_router(ai_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
