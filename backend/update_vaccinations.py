import asyncio
import random
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import get_client

ALL_VACCINES = [
    "BCG", "OPV-0", "Hep B-0",
    "OPV-1", "Pentavalent-1", "Rotavirus-1", "fIPV-1",
    "OPV-2", "Pentavalent-2", "Rotavirus-2",
    "OPV-3", "Pentavalent-3", "Rotavirus-3", "fIPV-2",
    "MR-1", "JE-1", "PCV Booster",
    "MR-2", "JE-2", "DPT Booster-1", "OPV Booster",
    "DPT Booster-2",
    "Td (Tetanus adult diphtheria)"
]

async def update_vaccinations():
    client = get_client()
    db = client.anganwadi
    
    children_cursor = db.children.find({})
    children = await children_cursor.to_list(length=None)
    
    updated_count = 0
    
    for child in children:
        # Give them a random subset of vaccines to simulate some completed, some not
        num_vaccines = random.randint(0, len(ALL_VACCINES) // 2)
        completed_vaccines = random.sample(ALL_VACCINES, num_vaccines)
        
        await db.children.update_one(
            {"_id": child["_id"]},
            {"$set": {"vaccinations": completed_vaccines}}
        )
        updated_count += 1
            
    print(f"Updated {updated_count} children with vaccination records.")

if __name__ == "__main__":
    asyncio.run(update_vaccinations())
