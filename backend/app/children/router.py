from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from .models import ChildCreate
from .service import create_child, list_children, get_child_by_child_id, list_children_with_status
from ..auth.dependencies import get_current_user, require_awc_access


router = APIRouter()


@router.get("/")
async def get_children(awc_code: str | None = None, user=Depends(get_current_user)):
    filter_query = {}
    if user.get("role") == "worker":
        filter_query["awc_code"] = user.get("awc_code")
    elif awc_code:
        filter_query["awc_code"] = awc_code
    return await list_children(filter_query)


@router.get("/with-status")
async def get_children_with_status(awc_code: str | None = None, user=Depends(get_current_user)):
    filter_query = {}
    if user.get("role") == "worker":
        filter_query["awc_code"] = user.get("awc_code")
    elif awc_code:
        filter_query["awc_code"] = awc_code
    return await list_children_with_status(filter_query)


@router.post("/")
async def register_child(payload: ChildCreate, user=Depends(get_current_user)):
    if user.get("role") not in {"worker", "admin"}:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Age validation — only children aged 0–5 years may be registered.
    try:
        dob = date.fromisoformat(payload.dob)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid date of birth format. Use YYYY-MM-DD.")

    today = date.today()
    age_years = (today - dob).days / 365.25
    if age_years > 10:
        raise HTTPException(
            status_code=422,
            detail="Only children aged 10 years or younger can be registered in this AWC programme.",
        )
    if dob > today:
        raise HTTPException(status_code=422, detail="Date of birth cannot be in the future.")

    payload.awc_code = payload.awc_code.strip()
    require_awc_access(payload.awc_code, user)
    data = payload.model_dump()
    data["created_by"] = user["id"]
    return await create_child(data)


@router.get("/{child_id}")
async def get_child_profile(child_id: str, user=Depends(get_current_user)):
    child = await get_child_by_child_id(child_id.strip())
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    if user.get("role") == "worker":
        require_awc_access(child.get("awc_code"), user)

    # Normalise DOB — seed data uses 'date_of_birth' (datetime), new registrations use 'dob' (str).
    raw_dob = child.get("dob") or child.get("date_of_birth")
    if raw_dob is None:
        child["dob"] = None
        child["age_months"] = None
    else:
        # Convert datetime objects to YYYY-MM-DD string
        if hasattr(raw_dob, "date"):
            dob_date = raw_dob.date()
        else:
            try:
                dob_date = date.fromisoformat(str(raw_dob)[:10])
            except ValueError:
                dob_date = None

        if dob_date:
            child["dob"] = dob_date.isoformat()
            today = date.today()
            months = (
                (today.year - dob_date.year) * 12
                + (today.month - dob_date.month)
                - (1 if today.day < dob_date.day else 0)
            )
            child["age_months"] = max(0, months)
        else:
            child["dob"] = None
            child["age_months"] = None

    return child
