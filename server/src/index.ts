import { Hono } from 'hono'
import { cors } from 'hono/cors'
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

export default app
