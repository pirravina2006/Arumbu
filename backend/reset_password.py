import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import get_client
from app.auth.utils import hash_password

async def reset():
    db = get_client().anganwadi
    email = "pirravina2006@gmail.com"
    new_password = "pirravina@2006"
    hashed = hash_password(new_password)
    
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"hashed_password": hashed}}
    )
    if result.modified_count > 0:
        print(f"Password reset successful for {email}")
    else:
        print(f"Could not reset password for {email} (maybe not found?)")

if __name__ == "__main__":
    asyncio.run(reset())
