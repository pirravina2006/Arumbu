import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def inspect():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.anganwadi

    children = await db.children.find().to_list(100)
    print(f"Total children: {len(children)}")
    
    for child in children:
        c_id = child.get("child_id")
        name = child.get("name")
        parent = child.get("parent_name")
        
        measurements = await db.growth_records.count_documents({"child_id": c_id})
        nutrition = await db.nutrition_logs.count_documents({"child_id": c_id})
        
        print(f"[{c_id}] {name} | Parent: {parent} | Msr: {measurements} | Nutr: {nutrition}")

asyncio.run(inspect())
