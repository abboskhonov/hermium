import { Hono } from 'hono'
import * as chatController from '../../controllers/hermes/chat.js'

const app = new Hono()

app.post('/api/hermes/chat/run', chatController.runChat)
app.post('/api/hermes/chat/abort', chatController.abortChat)
app.get('/api/hermes/chat/stream', chatController.streamChat)

export { app as chatRoutes }
