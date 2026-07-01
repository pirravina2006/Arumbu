import asyncio
import random
from datetime import datetime
import sys
import os

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_client

TAMIL_NAMES = [
    "Karthik", "Arun", "Vignesh", "Dinesh", "Suresh", "Ramesh", "Muthu", "Saravanan", "Rajesh", "Kannan",
    "Murugan", "Ganesh", "Balaji", "Praveen", "Ashok", "Senthil", "Siva", "Manikandan", "Prasanth", "Hari",
    "Priya", "Kavya", "Divya", "Deepa", "Meena", "Lakshmi", "Anitha", "Karthika", "Sneha", "Swathi",
    "Preethi", "Sangeetha", "Nithya", "Ramya", "Shalini", "Sowmya", "Geetha", "Maha", "Aruna", "Nandhini"
]
TAMIL_SURNAMES = ["Krishnan", "Natarajan", "Rajan", "Ramasamy", "Subramaniam", "Karthikeyan", "Chandran", "Pillai", "Naidu"]

async def update_database():
    client = get_client()
    db = client.anganwadi
    
    updated_children_count = 0
    added_measurements_count = 0
    updated_users_count = 0

    # 1. Update children names and add missing measurements
    children_cursor = db.children.find({})
    children = await children_cursor.to_list(length=None)
    
    for child in children:
        # Update name and parent_name to Tamil names
        new_name = f"{random.choice(TAMIL_NAMES)} {random.choice(TAMIL_SURNAMES)}"
        new_parent_name = f"{random.choice(TAMIL_NAMES)} {random.choice(TAMIL_SURNAMES)}"
        await db.children.update_one(
            {"_id": child["_id"]},
            {"$set": {"name": new_name, "parent_name": new_parent_name}}
        )
        updated_children_count += 1
            
        # Check for missing measurements
        child_id = child.get("child_id")
        record_count = await db.growth_records.count_documents({"child_id": child_id})
        
        if record_count == 0:
            awc_code = child.get("awc_code")
            dob = child.get("date_of_birth")
            if dob:
                age_months = (datetime.utcnow() - dob).days // 30
            else:
                age_months = 24
            
            if age_months < 0:
                age_months = 0
                
            growth_doc = {
                "child_id": child_id,
                "awc_code": awc_code,
                "measurement_date": datetime.utcnow(),
                "age_months": age_months,
                "weight_kg": 10.0 + random.uniform(-1, 1),
                "height_cm": 85.0 + random.uniform(-2, 2),
                "muac_cm": 13.5,
                "whz": 0.5,
                "wfh_status": "Normal",
                "status": "Normal",
                "z_scores": {
                    "waz": 0.5,
                    "haz": 0.5,
                    "whz": 0.5
                },
                "measured_by": "system_update",
                "created_at": datetime.utcnow()
            }
            await db.growth_records.insert_one(growth_doc)
            added_measurements_count += 1

    # 2. Update users
    users_cursor = db.users.find({})
    users = await users_cursor.to_list(length=None)
    for user in users:
        # Don't update admin name for safety, but others should be updated
        if user.get("role") != "admin":
            new_user_name = f"{random.choice(TAMIL_NAMES)} {random.choice(TAMIL_SURNAMES)}"
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"name": new_user_name}}
            )
            updated_users_count += 1
            
    print(f"Updated {updated_children_count} children with Tamil names.")
    print(f"Added measurements for {added_measurements_count} children who had none.")
    print(f"Updated {updated_users_count} users with Tamil names.")

if __name__ == "__main__":
    asyncio.run(update_database())
