from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi import status

from .models import ChangePassword, TokenResponse, UserLogin, SignupRequest, UserPublic
from .service import (
    authenticate_user,
    build_access_token,
    issue_refresh_token,
    revoke_refresh_token,
    get_user_by_email,
    create_user,
)
from .utils import hash_password, verify_password, hash_refresh_token
from .dependencies import get_current_user
from ..database import get_db, to_object_id
from ..rate_limit import limiter


router = APIRouter()


@router.post("/login", response_model=TokenResponse)
@limiter.limit("100/15 minutes")
async def login(request: Request, data: UserLogin, response: Response):
    user = await authenticate_user(data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = await build_access_token(user)
    refresh_token = await issue_refresh_token(user["id"])
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,
        secure=False,
    )
    return TokenResponse(access_token=access_token)


@router.post("/signup", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest):
    existing = await get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    data = payload.model_dump()
    data["role"] = "worker"
    data["is_active"] = True
    created = await create_user(data)
    created.pop("hashed_password", None)
    return created


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: Request):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Missing refresh token")

    db = get_db()
    token_hash = hash_refresh_token(refresh_token)
    token_doc = await db.refresh_tokens.find_one(
        {"token_hash": token_hash, "is_revoked": False}
    )
    if not token_doc:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    valid = await verify_refresh_token(token_doc["user_id"], refresh_token)
    if not valid:
        raise HTTPException(status_code=401, detail="Expired refresh token")

    user = await db.users.find_one({"_id": to_object_id(token_doc["user_id"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = await build_access_token({"id": str(user["_id"]), **user})
    return TokenResponse(access_token=access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response, user=Depends(get_current_user)):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        await revoke_refresh_token(user["id"], refresh_token)
    response.delete_cookie("refresh_token")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me")
async def me(user=Depends(get_current_user)):
    user.pop("hashed_password", None)
    return user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(payload: ChangePassword, user=Depends(get_current_user)):
    if not verify_password(payload.current_password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect password")

    db = get_db()
    await db.users.update_one(
        {"_id": to_object_id(user["id"])},
        {"$set": {"hashed_password": hash_password(payload.new_password)}}
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
