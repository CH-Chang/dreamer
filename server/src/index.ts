import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { dreamsRoute } from './routes/dreams'
import { usersRoute } from './routes/users'
import { commentsRoute } from './routes/comments'

const app = new Hono()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/api/dreams', dreamsRoute)
app.route('/api/users', usersRoute)
app.route('/api/comments', commentsRoute)

const port = Number(process.env.PORT) || 3000

if (process.env.NODE_ENV !== 'test') {
  console.log(`Hono server is running on http://localhost:${port}`)
  serve({
    fetch: app.fetch,
    port,
  })
}

export default app
