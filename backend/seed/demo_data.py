"""
Demo Data Seeding Script
Generates sample data for testing all system features.

Usage:
    python -m seed.demo_data
"""

import asyncio
from datetime import datetime, timedelta
import random
from passlib.context import CryptContext
from app.database import get_client, serialize_id
from app.auth.utils import hash_password

# Tamil Nadu names for demo environment
WORKER_NAMES = [
    "Lakshmi", "Priya", "Meena", "Anitha", "Deepa",
    "Kavya", "Sangeetha", "Divya", "Nithya", "Geetha"
]

CHILD_NAMES = [
    "Karthik", "Arun", "Vignesh", "Dinesh", "Suresh",
    "Ramesh", "Muthu", "Saravanan", "Rajesh", "Kannan",
    "Murugan", "Ganesh", "Balaji", "Praveen",
    "Ashok", "Senthil", "Siva", "Manikandan"
]

SUPERVISOR_NAMES = [
    "Ramesh Natarajan", "Suresh Krishnan", "Senthil Kumar",
    "Murugan Ramasamy", "Balaji Subramaniam"
]

AWC_CENTERS = [
    {"code": "TN-BNG-001", "name": "Banglore Sector 1", "block_code": "BNG"},
    {"code": "TN-BNG-002", "name": "Banglore Sector 2", "block_code": "BNG"},
    {"code": "TN-CHN-001", "name": "Chennai North", "block_code": "CHN"},
    {"code": "TN-CHN-002", "name": "Chennai South", "block_code": "CHN"},
    {"code": "TN-MAD-001", "name": "Madurai Central", "block_code": "MAD"},
]


async def seed_demo_data():
    """Generate complete demo dataset."""
    client = get_client()
    db = client.anganwadi

    # Clear existing data
    print("Clearing demo collections...")
    collections = [
        "users", "awc_centers", "children", "growth_records",
        "nutrition_logs", "meal_plans", "alerts", "notification_logs"
    ]
    for collection in collections:
        await db[collection].delete_many({})

    # 1. Seed AWC Centers
    print("Seeding AWC Centers...")
    awc_ids = {}
    for awc in AWC_CENTERS:
        result = await db.awc_centers.insert_one(awc)
        awc_ids[awc["code"]] = str(result.inserted_id)

    # 2. Seed Users (admin, supervisors, workers)
    print("Seeding Users...")
    users = [
        {
            "name": "Admin User",
            "email": "admin@icds.gov.in",
            "password_hash": hash_password("admin123"),
            "role": "admin",
            "awc_code": None,
            "phone": "9999999999",
            "is_active": True,
            "created_at": datetime.utcnow(),
        },
    ]

    # Add supervisors
    for i, name in enumerate(SUPERVISOR_NAMES):
        users.append({
            "name": name,
            "email": f"supervisor{i+1}@icds.gov.in",
            "password_hash": hash_password("supervisor123"),
            "role": "supervisor",
            "awc_code": None,
            "phone": f"98000{10000 + i}",
            "block_code": AWC_CENTERS[i % len(AWC_CENTERS)]["block_code"],
            "is_active": True,
            "created_at": datetime.utcnow(),
        })

    # Add workers (2 per AWC)
    worker_idx = 0
    for awc in AWC_CENTERS:
        for j in range(2):
            worker_name = WORKER_NAMES[(worker_idx + j) % len(WORKER_NAMES)]
            users.append({
                "name": worker_name,
                "email": f"worker_{awc['code']}_{j+1}@icds.gov.in",
                "password_hash": hash_password("worker123"),
                "role": "worker",
                "awc_code": awc["code"],
                "phone": f"97000{10000 + worker_idx + j}",
                "is_active": True,
                "created_at": datetime.utcnow(),
            })
        worker_idx += 2

    result = await db.users.insert_many(users)
    user_ids = {users[i]["email"]: str(result.inserted_ids[i]) for i in range(len(users))}

    # 3. Seed Children (6-8 per AWC)
    print("Seeding Children...")
    child_ids = {}
    for awc in AWC_CENTERS:
        child_count = 0
        for i in range(random.randint(6, 8)):
            child_count += 1
            child_name = random.choice(CHILD_NAMES)
            dob = datetime.utcnow() - timedelta(days=random.randint(180, 1460))  # 6-48 months
            gender = random.choice(["M", "F"])
            custom_child_id = f"{awc['code']}-{str(child_count).zfill(4)}"

            child_doc = {
                "child_id": custom_child_id,
                "name": child_name,
                "date_of_birth": dob,
                "gender": gender,
                "awc_code": awc["code"],
                "awc_name": awc["name"],
                "parent_name": random.choice(WORKER_NAMES) + f" {random.choice(['Krishnan', 'Natarajan', 'Rajan', 'Ramasamy', 'Subramaniam', 'Karthikeyan', 'Chandran', 'Pillai', 'Naidu'])}",
                "parent_phone": f"94000{random.randint(10000, 99999)}",
                "vaccinations": random.sample(["BCG", "OPV-0", "Hep B-0", "OPV-1", "Pentavalent-1", "Rotavirus-1"], random.randint(1, 6)),
                "created_at": datetime.utcnow(),
            }

            result = await db.children.insert_one(child_doc)
            child_doc["_id"] = result.inserted_id
            child_ids[custom_child_id] = child_doc

    # 4. Seed Growth Records (2-5 per child)
    print("Seeding Growth Records...")
    sam_created = False
    mam_created = False
    normal_created = False

    for custom_child_id, child_doc in child_ids.items():
        num_measurements = random.randint(2, 5)
        for m in range(num_measurements):
            days_ago = 30 * (num_measurements - m)
            measurement_date = datetime.utcnow() - timedelta(days=days_ago)

            # Age at measurement
            age_months = (measurement_date - child_doc["date_of_birth"]).days // 30

            if age_months < 0:
                continue

            # Generate realistic measurements
            base_weight = 3 + (age_months * 0.3)  # Rough estimate
            base_height = 50 + (age_months * 0.5)

            weight_kg = base_weight + random.uniform(-0.5, 0.5)
            height_cm = base_height + random.uniform(-2, 2)
            muac_cm = 9 + (age_months * 0.05)

            # Create SAM, MAM, and Normal cases in demo
            if not sam_created and age_months > 12:
                whz = -3.2  # SAM
                wfh_status = "SAM"
                sam_created = True
            elif not mam_created and age_months > 12:
                whz = -2.5  # MAM
                wfh_status = "MAM"
                mam_created = True
            else:
                # Normal distribution
                whz = random.uniform(-1.5, 1.5)
                wfh_status = "Normal" if whz > -2 else ("MAM" if whz > -3 else "SAM")
                normal_created = True

            measurement_doc = {
                "child_id": custom_child_id,
                "awc_code": child_doc["awc_code"],
                "measurement_date": measurement_date,
                "age_months": age_months,
                "weight_kg": round(weight_kg, 2),
                "height_cm": round(height_cm, 2),
                "muac_cm": round(muac_cm, 2),
                "whz": round(whz, 2),
                "wfh_status": wfh_status,
                "z_scores": {
                    "waz": round(whz * 0.8, 2),
                    "haz": round(whz * 0.6, 2),
                    "whz": round(whz, 2),
                },
                "measured_by": random.choice(list(user_ids.values())),
                "created_at": measurement_date,
            }

            await db.growth_records.insert_one(measurement_doc)

    # 5. Seed Nutrition Logs (1 per child)
    print("Seeding Nutrition Logs...")
    for custom_child_id in list(child_ids.keys())[:5]:  # Only 5 for demo
        child_doc = child_ids[custom_child_id]
        nutrition_doc = {
            "child_id": custom_child_id,
            "awc_code": child_doc["awc_code"],
            "log_date": datetime.utcnow() - timedelta(days=random.randint(1, 7)),
            "food_items": [
                {"name": "Rice", "quantity_g": 100},
                {"name": "Dal", "quantity_g": 50},
                {"name": "Vegetables", "quantity_g": 75},
                {"name": "Milk", "quantity_g": 200},
            ],
            "ai_analysis": {
                "deficiencies": [
                    {"nutrient": "Iron", "severity": "high", "suggested_foods": ["spinach", "eggs"]},
                    {"nutrient": "Calcium", "severity": "medium", "suggested_foods": ["milk", "yogurt"]},
                ],
                "meal_plan": [[{"day": "Monday", "breakfast": "Ragi porridge"} for _ in range(7)]],
                "referral_needed": False,
                "summary": "Child needs more iron-rich foods.",
            },
            "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 7)),
        }

        await db.nutrition_logs.insert_one(nutrition_doc)

    # 6. Seed Alerts (for SAM/MAM cases if they exist)
    print("Seeding Alerts...")
    if sam_created:
        first_child_id = list(child_ids.keys())[0]
        alert_doc = {
            "child_id": first_child_id,
            "awc_code": child_ids[first_child_id]["awc_code"],
            "alert_type": "sam_detected",
            "severity": "critical",
            "message": "🚨 CRITICAL: Child classified as SAM (WHZ: -3.20). Immediate referral required.",
            "status": "active",
            "details": {"whz": -3.2, "muac_cm": 10.5},
            "created_at": datetime.utcnow() - timedelta(hours=2),
            "created_by": random.choice(list(user_ids.values())),
        }

        await db.alerts.insert_one(alert_doc)

    print("\n✅ Demo data seeding complete!")
    print("\n📋 Demo Credentials:")
    print("   Admin:      admin@icds.gov.in / admin123")
    print("   Supervisor: supervisor1@icds.gov.in / supervisor123")
    print("   Worker:     worker_TN-BNG-001_1@icds.gov.in / worker123")
    print("\nTotal Records Generated:")
    print(f"   AWCs: {len(AWC_CENTERS)}")
    print(f"   Users: {len(users)}")
    print(f"   Children: {len(child_ids)}")
    print(f"   Measurements: {sum(1 for _ in child_ids)}")  # Approximation

    client.close()


if __name__ == "__main__":
    asyncio.run(seed_demo_data())
