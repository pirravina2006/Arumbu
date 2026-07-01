import asyncio
import random
from datetime import datetime, timedelta
import sys

# Try both pymongo and motor to see what is available
try:
    from motor.motor_asyncio import AsyncIOMotorClient
    HAS_MOTOR = True
except ImportError:
    HAS_MOTOR = False
    try:
        from pymongo import MongoClient
        HAS_PYMONGO = True
    except ImportError:
        print("Please install motor or pymongo")
        sys.exit(1)

PARENT_NAMES = [
    "Ramesh", "Suresh", "Lakshmi", "Priya", "Mohan", 
    "Karthik", "Anand", "Meena", "Shanthi", "Kumar", 
    "Murugan", "Saraswathi", "Babu", "Venkatesh", "Deepa"
]

def generate_nutrition_log(child_id, awc_code):
    return {
        "child_id": child_id,
        "awc_code": awc_code,
        "log_date": datetime.utcnow() - timedelta(days=random.randint(1, 3)),
        "food_items": [
            {"name": "Rice", "quantity_g": 100},
            {"name": "Dal", "quantity_g": 50},
            {"name": "Vegetables", "quantity_g": 75},
        ],
        "ai_analysis": {
            "deficiencies": [
                {"nutrient": "Iron", "severity": "medium", "suggested_foods": ["spinach", "dates"]},
            ],
            "meal_plan": [[{"day": "Monday", "breakfast": "Ragi porridge", "lunch": "Rice and Dal", "dinner": "Chapati"} for _ in range(7)]],
            "referral_needed": False,
            "summary": "Child's diet is generally okay but could use more iron-rich foods.",
            "caloric_adequacy_pct": 85,
            "score": 7,
            "model_used": "Gemini 3.1 Pro"
        },
        "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 3)),
    }

def generate_measurement(child):
    # Calculate age in months
    dob = child.get("date_of_birth", child.get("dob"))
    if not dob:
        dob = datetime.utcnow() - timedelta(days=365) # fallback 1 year
    
    age_months = (datetime.utcnow() - dob).days // 30
    if age_months < 0: age_months = 0
    
    base_weight = 3 + (age_months * 0.3)
    base_height = 50 + (age_months * 0.5)
    muac_cm = 9 + (age_months * 0.05)
    
    whz = random.uniform(-1.5, 1.5)
    wfh_status = "Normal" if whz > -2 else ("MAM" if whz > -3 else "SAM")
    
    return {
        "child_id": child.get("child_id"),
        "awc_code": child.get("awc_code", "UNKNOWN"),
        "measurement_date": datetime.utcnow() - timedelta(days=1),
        "age_months": age_months,
        "weight_kg": round(base_weight + random.uniform(-0.5, 0.5), 2),
        "height_cm": round(base_height + random.uniform(-2, 2), 2),
        "muac_cm": round(muac_cm, 2),
        "whz": round(whz, 2),
        "wfh_status": wfh_status,
        "z_scores": {
            "waz": round(whz * 0.8, 2),
            "haz": round(whz * 0.6, 2),
            "whz": round(whz, 2),
        },
        "created_at": datetime.utcnow() - timedelta(days=1),
    }

async def run_async():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.anganwadi
    
    children = await db.children.find().to_list(1000)
    updated_parents = 0
    added_measurements = 0
    added_nutrition = 0
    
    for child in children:
        child_id = child.get("child_id")
        
        # 1. Check Parent Name
        parent = child.get("parent_name", "")
        if not parent or parent.lower().startswith("parent of") or parent.lower().startswith("parent "):
            new_parent = random.choice(PARENT_NAMES)
            await db.children.update_one(
                {"_id": child["_id"]},
                {"$set": {"parent_name": new_parent}}
            )
            updated_parents += 1
            
        # 2. Check Measurements
        measurements = await db.growth_records.count_documents({"child_id": child_id})
        if measurements == 0:
            await db.growth_records.insert_one(generate_measurement(child))
            added_measurements += 1
            
        # 3. Check Nutrition
        nutrition = await db.nutrition_logs.count_documents({"child_id": child_id})
        if nutrition == 0:
            await db.nutrition_logs.insert_one(generate_nutrition_log(child_id, child.get("awc_code")))
            added_nutrition += 1
            
    print(f"Updated {updated_parents} parent names.")
    print(f"Added measurements for {added_measurements} children.")
    print(f"Added nutrition logs for {added_nutrition} children.")
    client.close()

def run_sync():
    client = MongoClient("mongodb://localhost:27017")
    db = client.anganwadi
    
    children = list(db.children.find())
    updated_parents = 0
    added_measurements = 0
    added_nutrition = 0
    
    for child in children:
        child_id = child.get("child_id")
        
        # 1. Check Parent Name
        parent = child.get("parent_name", "")
        if not parent or parent.lower().startswith("parent of") or parent.lower().startswith("parent "):
            new_parent = random.choice(PARENT_NAMES)
            db.children.update_one(
                {"_id": child["_id"]},
                {"$set": {"parent_name": new_parent}}
            )
            updated_parents += 1
            
        # 2. Check Measurements
        measurements = db.growth_records.count_documents({"child_id": child_id})
        if measurements == 0:
            db.growth_records.insert_one(generate_measurement(child))
            added_measurements += 1
            
        # 3. Check Nutrition
        nutrition = db.nutrition_logs.count_documents({"child_id": child_id})
        if nutrition == 0:
            db.nutrition_logs.insert_one(generate_nutrition_log(child_id, child.get("awc_code")))
            added_nutrition += 1
            
    print(f"Updated {updated_parents} parent names.")
    print(f"Added measurements for {added_measurements} children.")
    print(f"Added nutrition logs for {added_nutrition} children.")
    client.close()

if __name__ == "__main__":
    if HAS_MOTOR:
        asyncio.run(run_async())
    else:
        run_sync()
