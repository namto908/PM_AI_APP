from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.common.config import settings

bearer = HTTPBearer()

# Workspace role hierarchy (ascending)
WORKSPACE_ROLE_ORDER = ["guest", "employee", "manager", "owner"]
# System role hierarchy (ascending)
SYSTEM_ROLE_ORDER = ["guest", "employee", "manager", "superadmin"]


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    try:
        payload = jwt.decode(
            credentials.credentials, settings.JWT_SECRET, algorithms=["HS256"]
        )
        if "user_id" not in payload:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def require_workspace_role(minimum_role: str):
    """Dependency factory: check workspace role of user (via JWT payload)."""

    async def check(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("workspace_role", "guest")
        # superadmin bypasses all workspace role checks
        if current_user.get("system_role") == "superadmin":
            return current_user
        try:
            if WORKSPACE_ROLE_ORDER.index(user_role) < WORKSPACE_ROLE_ORDER.index(minimum_role):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        except ValueError:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user

    return check


def require_system_role(minimum_role: str):
    """Dependency factory: check system_role of user from JWT."""

    async def check(current_user: dict = Depends(get_current_user)) -> dict:
        system_role = current_user.get("system_role", "employee")
        try:
            if SYSTEM_ROLE_ORDER.index(system_role) < SYSTEM_ROLE_ORDER.index(minimum_role):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient system permissions")
        except ValueError:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient system permissions")
        return current_user

    return check
