from fastapi import APIRouter, Depends, HTTPException

from .models import MeasurementIn
from .service import add_measurement, list_measurements, get_latest_measurement, get_chart_data
from ..auth.dependencies import get_current_user, require_awc_access
from ..children.service import get_child_by_child_id


router = APIRouter()


@router.post("/measurement")
async def create_measurement(payload: MeasurementIn, user=Depends(get_current_user)):
    child = await get_child_by_child_id(payload.child_id.strip())
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    if user.get("role") == "worker":
        require_awc_access(child.get("awc_code"), user)

    data = payload.model_dump()
    data["child_id"] = data["child_id"].strip()
    data["measured_by"] = user["id"]
    return await add_measurement(data, child["gender"], current_user=user, child_info=child)


@router.get("/{child_id}")
async def get_growth_history(child_id: str, user=Depends(get_current_user)):
    child_id = child_id.strip()
    child = await get_child_by_child_id(child_id)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    if user.get("role") == "worker":
        require_awc_access(child.get("awc_code"), user)

    return await list_measurements(child_id)


@router.get("/{child_id}/latest")
async def get_latest(child_id: str, user=Depends(get_current_user)):
    child_id = child_id.strip()
    child = await get_child_by_child_id(child_id)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    if user.get("role") == "worker":
        require_awc_access(child.get("awc_code"), user)

    latest = await get_latest_measurement(child_id)
    if not latest:
        raise HTTPException(status_code=404, detail="No measurements")

    return latest


@router.get("/{child_id}/chart-data")
async def get_chart(child_id: str, user=Depends(get_current_user)):
    child_id = child_id.strip()
    child = await get_child_by_child_id(child_id)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    if user.get("role") == "worker":
        require_awc_access(child.get("awc_code"), user)

    return await get_chart_data(child_id)
