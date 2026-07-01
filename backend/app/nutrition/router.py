from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks

from .models import NutritionLogIn, NutritionAskIn
from .service import create_nutrition_log, get_nutrition_log, list_nutrition_logs, run_ai_analysis, ask_nutrition_question
from ..auth.dependencies import get_current_user, require_awc_access
from ..children.service import get_child_by_child_id
from ..growth.service import get_latest_measurement


router = APIRouter()


@router.post("/log")
async def log_nutrition(
    payload: NutritionLogIn,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
):
    payload.child_id = payload.child_id.strip()
    child = await get_child_by_child_id(payload.child_id)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    if user.get("role") == "worker":
        require_awc_access(child.get("awc_code"), user)

    data = payload.model_dump()
    data["logged_by"] = user["id"]
    log = await create_nutrition_log(data)

    latest_measurement = await get_latest_measurement(payload.child_id)
    analysis_queued = False
    if latest_measurement:
        status = latest_measurement.get("status") or latest_measurement.get("wfh_status")
        child_data = {
            "name": child.get("name"),
            "age_months": latest_measurement["age_months"],
            "weight_kg": latest_measurement["weight_kg"],
            "height_cm": latest_measurement["height_cm"],
            "muac_cm": latest_measurement["muac_cm"],
            "status": status,
        }
        background_tasks.add_task(
            run_ai_analysis,
            log["id"],
            child_data,
            data["food_items"],
        )
        analysis_queued = True

    if analysis_queued:
        message = "Log saved. AI analysis in progress."
    else:
        message = (
            "Log saved. AI analysis is not available until the child has at least one growth measurement. "
            "Please add a measurement and submit another diet log."
        )

    return {"message": message, "log_id": log["id"], "analysis_queued": analysis_queued}


@router.get("/log/{log_id}")
async def get_nutrition_log_detail(log_id: str, user=Depends(get_current_user)):
    log = await get_nutrition_log(log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    return log


@router.post("/ask")
async def ask_nutrition(payload: NutritionAskIn, user=Depends(get_current_user)):
    payload.child_id = payload.child_id.strip()
    child = await get_child_by_child_id(payload.child_id)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    latest_measurement = await get_latest_measurement(payload.child_id)
    child_data = {
        "name": child.get("name", ""),
        "age_months": latest_measurement["age_months"] if latest_measurement else 0,
    }
    answer = await ask_nutrition_question(payload.log_id, child_data, payload.question)
    return {"answer": answer}


@router.get("/{child_id}/history")
async def get_nutrition_history(child_id: str, user=Depends(get_current_user)):
    child = await get_child_by_child_id(child_id)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    if user.get("role") == "worker":
        require_awc_access(child.get("awc_code"), user)

    return await list_nutrition_logs(child_id)
