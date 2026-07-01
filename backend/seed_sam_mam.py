import asyncio
import random
from datetime import datetime, timedelta
from app.database import get_client

TAMIL_NAMES = [
    "Karthik", "Arun", "Vignesh", "Dinesh", "Suresh", "Ramesh", "Muthu", "Saravanan", "Rajesh", "Kannan",
    "Murugan", "Ganesh", "Balaji", "Praveen", "Ashok", "Senthil", "Siva", "Manikandan", "Prasanth", "Hari",
    "Priya", "Kavya", "Divya", "Deepa", "Meena", "Lakshmi", "Anitha", "Karthika", "Sneha", "Swathi",
    "Preethi", "Sangeetha", "Nithya", "Ramya", "Shalini", "Sowmya", "Geetha", "Maha", "Aruna", "Nandhini"
]
TAMIL_SURNAMES = ["Krishnan", "Natarajan", "Rajan", "Ramasamy", "Subramaniam", "Karthikeyan", "Chandran", "Pillai", "Naidu"]

async def add_custom_data():
    client = get_client()
    db = client.anganwadi
    
    awc_code = "AWC-BNG-006"
    awc_name = "AWC-BNG-006 Center"
    
    # Delete the previously added "Demo Child" data for this AWC
    await db.children.delete_many({"awc_code": awc_code, "name": {"$regex": "^Demo Child"}})
    await db.growth_records.delete_many({"awc_code": awc_code, "measured_by": "system"})

    # Get max child_id for the AWC to avoid conflicts
    cursor = db.children.find({"awc_code": awc_code}).sort("child_id", -1).limit(1)
    last_child = await cursor.to_list(length=1)
    
    start_count = 100
    if last_child:
        last_id = last_child[0]["child_id"]
        try:
            start_count = int(last_id.split("-")[-1]) + 1
        except:
            pass

    children = []
    growth_records = []
    
    config = [
        {"status": "SAM", "count": 5, "whz": -3.5, "muac": 11.0},
        {"status": "MAM", "count": 5, "whz": -2.5, "muac": 12.0},
        {"status": "Normal", "count": 10, "whz": 0.5, "muac": 13.5}
    ]
    
    for cfg in config:
        for _ in range(cfg["count"]):
            child_id = f"{awc_code}-{str(start_count).zfill(4)}"
            name = random.choice(TAMIL_NAMES) + f" {random.choice(TAMIL_SURNAMES)}"
            dob = datetime.utcnow() - timedelta(days=365 * 2)  # 2 years old
            
            # Child doc
            child_doc = {
                "child_id": child_id,
                "name": name,
                "date_of_birth": dob,
                "dob": dob.strftime("%Y-%m-%d"),
                "gender": random.choice(["M", "F"]),
                "awc_code": awc_code,
                "awc_name": awc_name,
                "parent_name": random.choice(TAMIL_NAMES) + f" {random.choice(TAMIL_SURNAMES)}",
                "parent_phone": f"900000{start_count}",
                "vaccinations": random.sample(["BCG", "OPV-0", "Hep B-0", "OPV-1", "Pentavalent-1", "Rotavirus-1"], random.randint(1, 6)),
                "created_at": datetime.utcnow()
            }
            children.append(child_doc)
            
            # Growth record
            growth_doc = {
                "child_id": child_id,
                "awc_code": awc_code,
                "measurement_date": datetime.utcnow(),
                "age_months": 24,
                "weight_kg": 10.0 if cfg['status'] == 'Normal' else (8.0 if cfg['status'] == 'MAM' else 6.0),
                "height_cm": 85.0,
                "muac_cm": cfg["muac"],
                "whz": cfg["whz"],
                "wfh_status": cfg["status"],
                "status": cfg["status"],
                "z_scores": {
                    "waz": cfg["whz"],
                    "haz": cfg["whz"],
                    "whz": cfg["whz"]
                },
                "measured_by": "system",
                "created_at": datetime.utcnow()
            }
            growth_records.append(growth_doc)
            
            start_count += 1
            
    # Insert
    if children:
        await db.children.insert_many(children)
        print(f"Inserted {len(children)} children.")
    if growth_records:
        await db.growth_records.insert_many(growth_records)
        print(f"Inserted {len(growth_records)} growth records.")
        
    print("Done adding SAM/MAM/Normal custom data!")

if __name__ == "__main__":
    asyncio.run(add_custom_data())
