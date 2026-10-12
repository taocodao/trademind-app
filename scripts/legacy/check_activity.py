import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    import asyncpg
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    
    print("\n--- RECENT EXECUTIONS ---")
    rows = await conn.fetch("SELECT use.id, use.signal_id, use.source, s.strategy, use.created_at FROM user_signal_executions use LEFT JOIN signals s ON use.signal_id = s.id ORDER BY use.created_at DESC LIMIT 10")
    for r in rows:
        print(dict(r))
        
    await conn.close()

asyncio.run(check())
