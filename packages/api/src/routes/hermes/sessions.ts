import { Hono } from 'hono'
import * as sessionsController from '../../controllers/hermes/sessions.js'

const app = new Hono()

app.get('/api/hermes/sessions', sessionsController.listSessions)
app.get('/api/hermes/sessions/:id', sessionsController.getSession)
app.post('/api/hermes/sessions', sessionsController.createSession)
app.patch('/api/hermes/sessions/:id', sessionsController.updateSession)
app.delete('/api/hermes/sessions/:id', sessionsController.deleteSession)
app.post('/api/hermes/sessions/:id/rename', sessionsController.renameSession)
app.post('/api/hermes/sessions/:id/messages', sessionsController.addMessage)

export { app as sessionRoutes }
