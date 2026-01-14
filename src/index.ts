import { Hono } from 'hono'

const app = new Hono()

const TARGET_HOST = 'kuota.pandai.my.id'
const TARGET_URL = `https://${TARGET_HOST}`

app.all('*', async (c) => {
  const url = new URL(c.req.url)
  const targetPath = `${TARGET_URL}${url.pathname}${url.search}`

  // 1. WebSocket Passthrough
  // If the request is a WS upgrade, EdgeOne handles it if you return a fetch()
  if (c.req.header('Upgrade')?.toLowerCase() === 'websocket') {
    return fetch(targetPath, {
      headers: {
        ...c.req.header(),
        'Host': TARGET_HOST,
        'Origin': TARGET_URL,
      },
    })
  }

  // 2. Standard HTTP Proxy
  const proxyReq = new Request(targetPath, {
    method: c.req.method,
    headers: c.req.header(),
    body: c.req.raw.body,
    // @ts-ignore
    duplex: 'half'
  })

  proxyReq.headers.set('Host', TARGET_HOST)
  proxyReq.headers.set('Origin', TARGET_URL)

  return fetch(proxyReq)
})

export default app
