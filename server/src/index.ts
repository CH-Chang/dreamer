import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { initDatabase } from './lib/alaSqlService'
import { dreamsRoute } from './routes/dreams'
import { usersRoute } from './routes/users'
import { commentsRoute } from './routes/comments'
import { categoriesRoute } from './routes/categories'
import { rateLimitsRoute } from './routes/rateLimits'
import { videosRoute } from './routes/videos'
import { comicsRoute } from './routes/comics'
import { editLogsRoute } from './routes/editLogs'
import { aiRoute } from './routes/ai'
import { mediaRoute } from './routes/media'

const app = new Hono()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Auto-initialize DB from Google Sheets before handling requests
app.use('*', async (c, next) => {
  await initDatabase()
  await next()
})

// Health check endpoints (both /health and /api/health)
app.get('/health', (c) => c.json({ status: 'ok' }))
app.get('/api/health', (c) => c.json({ status: 'ok' }))

// Mount all API routes
app.route('/api/dreams', dreamsRoute)
app.route('/api/users', usersRoute)
app.route('/api/comments', commentsRoute)
app.route('/api/categories', categoriesRoute)
app.route('/api/rate-limits', rateLimitsRoute)
app.route('/api/videos', videosRoute)
app.route('/api/comics', comicsRoute)
app.route('/api/edit-logs', editLogsRoute)
app.route('/api/ai', aiRoute)
app.route('/api/media', mediaRoute)

const port = Number(process.env.PORT) || 3000

if (process.env.NODE_ENV !== 'test') {
  initDatabase().then(() => {
    console.log(`Google Sheets DB initialized successfully.`)
  }).catch((err) => {
    console.error(`Failed to initialize Google Sheets DB:`, err)
  })

  console.log(`Hono server is running on http://localhost:${port}`)
  serve({
    fetch: app.fetch,
    port,
  })
}

export default app
