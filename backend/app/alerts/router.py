from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from app.auth.dependencies import get_current_user, require_role
from app.alerts.models import AlertOut, AlertStatus
from app.alerts.service import (
    get_alert_by_id,
    list_alerts_for_awc,
    list_alerts_for_child,
    acknowledge_alert,
    resolve_alert,
    get_active_alerts_count,
)

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=List[AlertOut])
async def get_awc_alerts(
    status: Optional[AlertStatus] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch alerts for user's AWC.
    Optionally filter by status: active, acknowledged, resolved.
    """
    awc_code = current_user.get("awc_code")
    if not awc_code:
        raise HTTPException(status_code=403, detail="User has no AWC assigned")
    
    alerts = await list_alerts_for_awc(
        awc_code=awc_code,
        status=status,
        limit=limit,
        skip=skip
    )
    return alerts


@router.get("/{alert_id}", response_model=AlertOut)
async def get_alert(
    alert_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Fetch single alert by ID."""
    alert = await get_alert_by_id(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.get("/child/{child_id}", response_model=List[AlertOut])
async def get_child_alerts(
    child_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Fetch all alerts for a specific child (for child profile page)."""
    alerts = await list_alerts_for_child(child_id.strip())
    return alerts


@router.post("/{alert_id}/acknowledge")
async def acknowledge(
    alert_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Mark alert as acknowledged (seen but not resolved)."""
    success = await acknowledge_alert(alert_id, current_user)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert acknowledged"}


@router.post("/{alert_id}/resolve")
async def resolve(
    alert_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Mark alert as resolved (action taken)."""
    success = await resolve_alert(alert_id, current_user)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert resolved"}


@router.get("/stats/active-count")
async def get_active_count(
    current_user: dict = Depends(get_current_user),
):
    """Get count of active alerts for AWC (for dashboard summary)."""
    awc_code = current_user.get("awc_code")
    if not awc_code:
        raise HTTPException(status_code=403, detail="User has no AWC assigned")
    
    count = await get_active_alerts_count(awc_code)
    return {"active_alerts": count}
