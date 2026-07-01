import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import get_client

async def check():
    db = get_client().anganwadi
    users = await db.users.find({}).to_list(length=10)
    print("Checking users:")
    for u in users:
        print(f"Email: {u.get('email')} | Role: {u.get('role')} | Name: {u.get('name')}")

if __name__ == "__main__":
    asyncio.run(check())
