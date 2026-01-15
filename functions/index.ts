import { Hono } from 'hono';

const app = new Hono();

const TARGET_HOST = 'kuota.pandai.my.id';
const TARGET_URL = `https://${TARGET_HOST}`;

app.all('*', async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  
  // VLESS WS check
  if (upgradeHeader === 'websocket') {
    const url = new URL(c.req.url);
    const targetUrl = `https://${TARGET_HOST}${url.pathname}${url.search}`;

    // Perform the fetch to the origin
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Host': TARGET_HOST,
        'Origin': `https://${TARGET_HOST}`,
        'Sec-WebSocket-Key': c.req.header('Sec-WebSocket-Key') || '',
        'Sec-WebSocket-Version': '13',
        // Forward potential V2Ray/Xray headers if they exist
        'User-Agent': c.req.header('User-Agent') || 'v2ray-proxy',
      }
    });

    // If the origin server accepts the upgrade (101 Switching Protocols)
    if (res.status === 101) {
      return res;
    }
    
    return new Response("WS Upgrade Failed", { status: 502 });
  }

  // Standard HTTP fallback
  return fetch(`${TARGET_URL}${new URL(c.req.url).pathname}`, {
    method: c.req.method,
    headers: { ...c.req.header(), 'Host': TARGET_HOST },
    body: c.req.raw.body,
    // @ts-ignore
    duplex: 'half'
  });
});

export const onRequest = (context: any) => app.fetch(context.request, context.env, context);