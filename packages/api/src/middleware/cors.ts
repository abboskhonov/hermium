import { cors } from 'hono/cors'
import { config } from '../config.js'

export const corsMiddleware = cors({
  origin: config.corsOrigins === '*' ? '*' : config.corsOrigins.split(','),
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Hermes-Profile'],
  credentials: true,
})
