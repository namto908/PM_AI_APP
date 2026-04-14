from pydantic import BaseModel, EmailStr, field_validator
import uuid


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    name: str
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("username")
    @classmethod
    def username_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Username cannot be empty")
        return v.strip()

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()


class LoginRequest(BaseModel):
    identifier: str  # Can be email or username
    password: str

    @field_validator("identifier")
    @classmethod
    def strip_identifier(cls, v: str) -> str:
        return v.strip()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    avatar_url: str | None
    system_role: str
    is_active: bool = True
    is_root: bool = False

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    name: str | None = None
    email: EmailStr | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class WorkspaceCreate(BaseModel):
    name: str
    slug: str

    @field_validator("slug")
    @classmethod
    def slug_format(cls, v: str) -> str:
        import re
        if not re.match(r"^[a-z0-9-]+$", v):
            raise ValueError("Slug must contain only lowercase letters, numbers, and hyphens")
        return v


class WorkspaceResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    role: str | None = None
    owner_name: str | None = None
    owner_email: str | None = None

    model_config = {"from_attributes": True}


# ── Group schemas ──────────────────────────────────────────────────────────────

class GroupCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Group name cannot be empty")
        return v.strip()


class GroupResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    created_by: uuid.UUID | None

    model_config = {"from_attributes": True}


class GroupMemberAdd(BaseModel):
    user_id: uuid.UUID


# ── Workspace member management ────────────────────────────────────────────────

class WorkspaceMemberAdd(BaseModel):
    user_id: uuid.UUID
    role: str = "employee"

    @field_validator("role")
    @classmethod
    def valid_role(cls, v: str) -> str:
        if v not in ("owner", "manager", "employee", "guest"):
            raise ValueError("role must be one of: owner, manager, employee, guest")
        return v


class WorkspaceMemberResponse(BaseModel):
    user_id: uuid.UUID
    name: str | None = None
    email: str | None = None
    role: str
    joined_at: str

    model_config = {"from_attributes": True}


# ── Admin schemas ──────────────────────────────────────────────────────────────

class AdminUserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    system_role: str | None = None
    is_active: bool | None = None

    @field_validator("system_role")
    @classmethod
    def valid_system_role(cls, v: str | None) -> str | None:
        if v is not None:
            if v == "superadmin":
                raise ValueError("Assigning the superadmin role is not permitted")
            if v not in ("manager", "employee", "guest"):
                raise ValueError("system_role must be one of: manager, employee, guest")
        return v


class AdminUserCreate(BaseModel):
    email: EmailStr
    username: str
    name: str
    password: str
    system_role: str = "employee"

    @field_validator("username", "name")
    @classmethod
    def strip_strings(cls, v: str) -> str:
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("system_role")
    @classmethod
    def valid_system_role(cls, v: str) -> str:
        if v not in ("manager", "employee", "guest"):
            raise ValueError("system_role must be one of: manager, employee, guest")
        return v
