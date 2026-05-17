import { Hono } from 'hono'
import * as ctrl from '../../controllers/hermes/usage-stats.js'

export const usageRoutes = new Hono()

usageRoutes.get('/api/hermes/usage/stats', ctrl.getUsageStats)
