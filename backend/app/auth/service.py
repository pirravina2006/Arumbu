from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt

from ..config import settings
from ..database import get_db, serialize_id, to_object_id
from .utils import (
    create_access_token,
    hash_password,
    verify_password,
    new_refresh_token,
    hash_refresh_token,
)


async def get_user_by_email(email: str) -> Optional[dict]:
    try:
        db = get_db()
        user = await db.users.find_one({"email": email})
    except Exception:
        return None
    return serialize_id(user) if user else None


async def get_user_by_id(user_id: str) -> Optional[dict]:
    try:
        db = get_db()
        user = await db.users.find_one({"_id": to_object_id(user_id)})
    except Exception:
        return None
    return serialize_id(user) if user else None


async def authenticate_user(email: str, password: str) -> Optional[dict]:
    user = await get_user_by_email(email)
    if not user or not verify_password(password, user["hashed_password"]):
        return None
    if not user.get("is_active", True):
        return None
    return user


async def create_user(data: dict) -> dict:
    db = get_db()
    data["hashed_password"] = hash_password(data.pop("password"))
    data["created_at"] = datetime.now(timezone.utc)
    data["last_login"] = None
    result = await db.users.insert_one(data)
    user = await db.users.find_one({"_id": result.inserted_id})
    return serialize_id(user)


async def build_access_token(user: dict) -> str:
    claims = {
        "name": user["name"],
        "role": user["role"],
        "awc_code": user.get("awc_code"),
        "sector_code": user.get("sector_code"),
        "block_code": user.get("block_code"),
        "district_code": user.get("district_code"),
    }
    return create_access_token(user["id"], claims)


async def issue_refresh_token(user_id: str) -> str:
    db = get_db()
    token = new_refresh_token()
    token_hash = hash_refresh_token(token)
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.refresh_token_expire_days
    )
    await db.refresh_tokens.insert_one(
        {
            "user_id": user_id,
            "token_hash": token_hash,
            "expires_at": expires_at,
            "is_revoked": False,
            "created_at": datetime.now(timezone.utc),
        }
    )
    return token


async def verify_refresh_token(user_id: str, token: str) -> bool:
    db = get_db()
    token_hash = hash_refresh_token(token)
    doc = await db.refresh_tokens.find_one(
        {"user_id": user_id, "token_hash": token_hash, "is_revoked": False}
    )
    if not doc:
        return False
    return doc["expires_at"] > datetime.now(timezone.utc)


async def revoke_refresh_token(user_id: str, token: str) -> None:
    db = get_db()
    token_hash = hash_refresh_token(token)
    await db.refresh_tokens.update_one(
        {"user_id": user_id, "token_hash": token_hash},
        {"$set": {"is_revoked": True}},
    )


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
