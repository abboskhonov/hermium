import { Hono } from 'hono'
import * as ctrl from '../../controllers/hermes/memory.js'

export const memoryRoutes = new Hono()

memoryRoutes.get('/api/hermes/memory', ctrl.getMemory)
memoryRoutes.post('/api/hermes/memory', ctrl.saveMemory)
