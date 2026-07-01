import asyncio
import sys
import os

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_client

async def fix_name():
    client = get_client()
    db = client.anganwadi
    
    # Update user named Saravanan Rajan to Haridevi
    # Using regex to make it case-insensitive and handle possible spaces
    result = await db.users.update_many(
        {"name": {"$regex": "Saravanan Rajan", "$options": "i"}},
        {"$set": {"name": "Haridevi"}}
    )
    print(f"Found and updated {result.modified_count} users named Saravanan Rajan to Haridevi.")
    
    # If for some reason none were found, maybe the name was slightly different.
    if result.modified_count == 0:
        print("No user named Saravanan Rajan found. Listing current user names:")
        users = await db.users.find({}).to_list(length=None)
        for u in users:
            print(f" - {u.get('name')} (email: {u.get('email')}, role: {u.get('role')})")

if __name__ == "__main__":
    asyncio.run(fix_name())
