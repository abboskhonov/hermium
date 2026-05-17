import { Hono } from 'hono'
import * as ctrl from '../../controllers/hermes/skills.js'

export const skillRoutes = new Hono()

skillRoutes.get('/api/hermes/skills', ctrl.listSkills)
skillRoutes.get('/api/hermes/skills/:category/:skill/files', ctrl.listSkillFiles)
skillRoutes.get('/api/hermes/skills/*', ctrl.readSkillFile)
skillRoutes.put('/api/hermes/skills/toggle', ctrl.toggleSkill)
skillRoutes.put('/api/hermes/skills/pin', ctrl.pinSkill)
