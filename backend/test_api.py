import asyncio
from app.database import get_db
from app.children.router import get_child_profile

async def test():
    try:
        child = await get_child_profile('AWC-BNG-006-0002', {'role': 'worker', 'awc_code': 'AWC-BNG-006'})
        print(child)
    except Exception as e:
        print('Error:', e)
    
asyncio.run(test())
