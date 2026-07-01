from fastapi import APIRouter, Depends, HTTPException

from .models import MealPlanIn
from .service import create_meal_plan, get_latest_meal_plan, get_meal_plan
from ..auth.dependencies import get_current_user, require_awc_access
from ..children.service import get_child_by_child_id
from ..nutrition.service import list_nutrition_logs


router = APIRouter()


@router.post("/generate")
async def generate_meal_plan(
    payload: MealPlanIn,
    user=Depends(get_current_user),
):
    payload.child_id = payload.child_id.strip()
    child = await get_child_by_child_id(payload.child_id)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    if user.get("role") == "worker":
        require_awc_access(child.get("awc_code"), user)

    logs = await list_nutrition_logs(payload.child_id)
    if not logs or not logs[0].get("ai_analysis"):
        raise HTTPException(status_code=400, detail="No nutrition analysis available")

    meal_plan_data = logs[0]["ai_analysis"].get("meal_plan", [])
    if not meal_plan_data:
        raise HTTPException(status_code=400, detail="No meal plan in AI analysis")

    plan_days = [
        {
            "day": item.get("day", ""),
            "breakfast": item.get("breakfast", ""),
            "lunch": item.get("lunch", ""),
            "snack": item.get("snack", ""),
            "dinner": item.get("dinner", ""),
        }
        for item in meal_plan_data
    ]

    data = {
        "child_id": payload.child_id,
        "week_start": payload.week_start,
        "days": plan_days,
    }
    return await create_meal_plan(data)


@router.get("/{child_id}/latest")
async def get_latest(child_id: str, user=Depends(get_current_user)):
    child_id = child_id.strip()
    child = await get_child_by_child_id(child_id)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    if user.get("role") == "worker":
        require_awc_access(child.get("awc_code"), user)

    latest = await get_latest_meal_plan(child_id)
    if not latest:
        raise HTTPException(status_code=404, detail="No meal plans")

    return latest


@router.get("/{meal_plan_id}")
async def get_meal_plan_by_id(meal_plan_id: str, user=Depends(get_current_user)):
    plan = await get_meal_plan(meal_plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")

    child = await get_child_by_child_id(plan["child_id"])
    if user.get("role") == "worker":
        require_awc_access(child.get("awc_code"), user)

    return plan
