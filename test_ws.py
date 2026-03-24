import asyncio
import websockets

async def test():
    try:
        async with websockets.connect('ws://localhost:8000/ws/execute') as ws:
            print("CONNECTED")
            await ws.send('{"language":"python", "code":"print(123)"}')
            print("SENT")
            while True:
                try:
                    res = await asyncio.wait_for(ws.recv(), timeout=2.0)
                    print('RECV:', res)
                except asyncio.TimeoutError:
                    break
                except websockets.ConnectionClosed as e:
                    print('CLOSED', e)
                    break
    except Exception as e:
        print("ERR", e)

asyncio.run(test())
