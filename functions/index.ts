// functions/index.ts
import { Hono } from 'hono';

const app = new Hono();

// Target configuration
const TARGET_HOST = 'kuota.pandai.my.id';
const TARGET_URL = `https://${TARGET_HOST}`;

/**
 * Reverse Proxy Logic
 * Handles both standard HTTP and WebSocket (WSS) Upgrades
 */
app.all('*', async (c) => {
  const url = new URL(c.req.url);
  const targetPath = `${TARGET_URL}${url.pathname}${url.search}`;

  // 1. Detect WebSocket Upgrade
  // If the 'Upgrade' header is present, we return the fetch promise.
  // EdgeOne will handle the secure tunnel (WSS) automatically.
  if (c.req.header('Upgrade')?.toLowerCase() === 'websocket') {
    return fetch(targetPath, {
      method: c.req.method,
      headers: {
        ...c.req.header(),
        'Host': TARGET_HOST,
        'Origin': TARGET_URL,
      },
    });
  }

  // 2. Standard HTTP Proxy
  const proxyReq = new Request(targetPath, {
    method: c.req.method,
    headers: c.req.header(),
    body: c.req.raw.body,
    // @ts-ignore - Required for streaming bodies in the Edge runtime
    duplex: 'half'
  });

  // Overwrite headers to match the target to prevent SSL/SNI errors
  proxyReq.headers.set('Host', TARGET_HOST);
  proxyReq.headers.set('Origin', TARGET_URL);

  return fetch(proxyReq);
});

// EdgeOne Pages requirement: Export the onRequest handler
export const onRequest = (context: any) => {
  return app.fetch(context.request, context.env, context);
};
