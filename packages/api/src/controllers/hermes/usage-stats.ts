import type { Context } from 'hono'
import { Database } from 'bun:sqlite'
import { getDb } from '../../db/index.js'
import { resolve, join } from 'path'
import { homedir } from 'os'
import { existsSync, readFileSync } from 'fs'
import { logger } from '../../lib/logger.js'

interface UsageStatsModelRow {
  model: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  sessions: number
}

interface UsageStatsDailyRow {
  date: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  sessions: number
  errors: number
  cost: number
}

interface MergedStats {
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  sessions: number
  by_model: Map<string, UsageStatsModelRow>
  by_day: Map<string, UsageStatsDailyRow>
}

function getHermesStateDbPath(): string | null {
  const hermesHome = process.env.HERMES_HOME
    ? resolve(process.env.HERMES_HOME)
    : resolve(homedir(), '.hermes')

  // Check active profile
  const activeProfileFile = join(hermesHome, 'active_profile')
  let profileDir = hermesHome
  try {
    const name = readFileSync(activeProfileFile, 'utf-8').trim()
    if (name && name !== 'default') {
      const dir = join(hermesHome, 'profiles', name)
      if (existsSync(dir)) profileDir = dir
    }
  } catch { /* default profile */ }

  const stateDb = join(profileDir, 'state.db')
  return existsSync(stateDb) ? stateDb : null
}

function queryWebUiDb(cutoff: number): MergedStats {
  const empty: MergedStats = {
    input_tokens: 0, output_tokens: 0,
    cache_read_tokens: 0, cache_write_tokens: 0,
    sessions: 0, by_model: new Map(), by_day: new Map(),
  }

  try {
    const db = getDb()

    const totals = db.query(`
      SELECT
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens,
        COALESCE(SUM(cache_read_tokens), 0) as cache_read_tokens,
        COALESCE(SUM(cache_write_tokens), 0) as cache_write_tokens,
        COUNT(DISTINCT session_id) as sessions
      FROM usage
      WHERE timestamp > ?
    `).get(cutoff) as Record<string, number>

    const byModel = db.query(`
      SELECT
        COALESCE(model, 'unknown') as model,
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens,
        COALESCE(SUM(cache_read_tokens), 0) as cache_read_tokens,
        COALESCE(SUM(cache_write_tokens), 0) as cache_write_tokens,
        COUNT(DISTINCT session_id) as sessions
      FROM usage
      WHERE timestamp > ?
      GROUP BY model
    `).all(cutoff) as UsageStatsModelRow[]

    const byDay = db.query(`
      SELECT
        DATE(timestamp / 1000, 'unixepoch') as date,
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens,
        COALESCE(SUM(cache_read_tokens), 0) as cache_read_tokens,
        COALESCE(SUM(cache_write_tokens), 0) as cache_write_tokens,
        COUNT(DISTINCT session_id) as sessions
      FROM usage
      WHERE timestamp > ?
      GROUP BY date
    `).all(cutoff) as Array<{ date: string; input_tokens: number; output_tokens: number; cache_read_tokens: number; cache_write_tokens: number; sessions: number }>

    const result: MergedStats = {
      input_tokens: totals.input_tokens,
      output_tokens: totals.output_tokens,
      cache_read_tokens: totals.cache_read_tokens,
      cache_write_tokens: totals.cache_write_tokens,
      sessions: totals.sessions,
      by_model: new Map(),
      by_day: new Map(),
    }

    for (const m of byModel) {
      result.by_model.set(m.model, { ...m })
    }
    for (const d of byDay) {
      result.by_day.set(d.date, {
        date: d.date,
        input_tokens: d.input_tokens,
        output_tokens: d.output_tokens,
        cache_read_tokens: d.cache_read_tokens,
        cache_write_tokens: d.cache_write_tokens,
        sessions: d.sessions,
        errors: 0,
        cost: 0,
      })
    }

    return result
  } catch (err: any) {
    logger.warn('[usage-stats] web-ui db query failed:', err.message)
    return empty
  }
}

function queryHermesStateDb(dbPath: string, sinceSeconds: number): MergedStats {
  const empty: MergedStats = {
    input_tokens: 0, output_tokens: 0,
    cache_read_tokens: 0, cache_write_tokens: 0,
    sessions: 0, by_model: new Map(), by_day: new Map(),
  }

  try {
    const db = new Database(dbPath, { readonly: true })

    // Check if table exists
    const tableCheck = db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'`).get()
    if (!tableCheck) {
      db.close()
      return empty
    }

    const totals = db.query(`
      SELECT
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens,
        COALESCE(SUM(cache_read_tokens), 0) as cache_read_tokens,
        COALESCE(SUM(cache_write_tokens), 0) as cache_write_tokens,
        COUNT(*) as sessions
      FROM sessions
      WHERE started_at > ?
    `).get(sinceSeconds) as Record<string, number>

    const byModel = db.query(`
      SELECT
        COALESCE(model, '') as model,
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens,
        COALESCE(SUM(cache_read_tokens), 0) as cache_read_tokens,
        COALESCE(SUM(cache_write_tokens), 0) as cache_write_tokens,
        COUNT(*) as sessions
      FROM sessions
      WHERE started_at > ? AND model IS NOT NULL
      GROUP BY model
    `).all(sinceSeconds) as UsageStatsModelRow[]

    const byDay = db.query(`
      SELECT
        date(started_at, 'unixepoch') as date,
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens,
        COALESCE(SUM(cache_read_tokens), 0) as cache_read_tokens,
        COALESCE(SUM(cache_write_tokens), 0) as cache_write_tokens,
        COUNT(*) as sessions
      FROM sessions
      WHERE started_at > ?
      GROUP BY date
    `).all(sinceSeconds) as Array<{ date: string; input_tokens: number; output_tokens: number; cache_read_tokens: number; cache_write_tokens: number; sessions: number }>

    db.close()

    const result: MergedStats = {
      input_tokens: totals.input_tokens,
      output_tokens: totals.output_tokens,
      cache_read_tokens: totals.cache_read_tokens,
      cache_write_tokens: totals.cache_write_tokens,
      sessions: totals.sessions,
      by_model: new Map(),
      by_day: new Map(),
    }

    for (const m of byModel) {
      result.by_model.set(m.model || 'unknown', { ...m, model: m.model || 'unknown' })
    }
    for (const d of byDay) {
      result.by_day.set(d.date, {
        date: d.date,
        input_tokens: d.input_tokens,
        output_tokens: d.output_tokens,
        cache_read_tokens: d.cache_read_tokens,
        cache_write_tokens: d.cache_write_tokens,
        sessions: d.sessions,
        errors: 0,
        cost: 0,
      })
    }

    return result
  } catch (err: any) {
    logger.warn('[usage-stats] hermes state.db query failed:', err.message)
    return empty
  }
}

function mergeStats(a: MergedStats, b: MergedStats): MergedStats {
  const merged: MergedStats = {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_read_tokens: a.cache_read_tokens + b.cache_read_tokens,
    cache_write_tokens: a.cache_write_tokens + b.cache_write_tokens,
    sessions: a.sessions + b.sessions,
    by_model: new Map(),
    by_day: new Map(),
  }

  // Merge models
  for (const [model, stats] of a.by_model) {
    merged.by_model.set(model, { ...stats })
  }
  for (const [model, stats] of b.by_model) {
    const existing = merged.by_model.get(model)
    if (existing) {
      existing.input_tokens += stats.input_tokens
      existing.output_tokens += stats.output_tokens
      existing.cache_read_tokens += stats.cache_read_tokens
      existing.cache_write_tokens += stats.cache_write_tokens
      existing.sessions += stats.sessions
    } else {
      merged.by_model.set(model, { ...stats })
    }
  }

  // Merge days
  for (const [date, stats] of a.by_day) {
    merged.by_day.set(date, { ...stats })
  }
  for (const [date, stats] of b.by_day) {
    const existing = merged.by_day.get(date)
    if (existing) {
      existing.input_tokens += stats.input_tokens
      existing.output_tokens += stats.output_tokens
      existing.cache_read_tokens += stats.cache_read_tokens
      existing.cache_write_tokens += stats.cache_write_tokens
      existing.sessions += stats.sessions
    } else {
      merged.by_day.set(date, { ...stats })
    }
  }

  return merged
}

export async function getUsageStats(c: Context) {
  const rawDays = parseInt(c.req.query('days') || '30', 10)
  const allTime = rawDays === 0
  const days = allTime
    ? 0
    : (Number.isFinite(rawDays) && rawDays > 0 ? Math.min(rawDays, 365) : 30)
  const cutoffMs = allTime ? 0 : Date.now() - days * 24 * 60 * 60 * 1000
  const cutoffSeconds = allTime ? 0 : Math.floor(cutoffMs / 1000)

  // Query our own database
  const webUiStats = queryWebUiDb(cutoffMs)

  // Query original hermes-web-ui state.db if it exists
  const hermesDbPath = getHermesStateDbPath()
  const hermesStats = hermesDbPath ? queryHermesStateDb(hermesDbPath, cutoffSeconds) : null

  // Merge
  const merged = hermesStats ? mergeStats(webUiStats, hermesStats) : webUiStats

  // Fill missing days with zeros (skip for all-time to avoid 1000s of empty rows)
  const dayMap = new Map<string, UsageStatsDailyRow>()
  if (!allTime) {
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      dayMap.set(key, { date: key, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, sessions: 0, errors: 0, cost: 0 })
    }
  }
  for (const d of merged.by_day.values()) {
    const existing = dayMap.get(d.date)
    if (existing) {
      existing.input_tokens = d.input_tokens
      existing.output_tokens = d.output_tokens
      existing.cache_read_tokens = d.cache_read_tokens
      existing.sessions = d.sessions
    } else if (allTime) {
      dayMap.set(d.date, { ...d })
    }
  }

  // Sort days ascending
  const dailyUsage = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date))

  // Sort models by total tokens desc
  const modelUsage = [...merged.by_model.values()].sort(
    (a, b) => (b.input_tokens + b.output_tokens) - (a.input_tokens + a.output_tokens),
  )

  return c.json({
    total_input_tokens: merged.input_tokens,
    total_output_tokens: merged.output_tokens,
    total_cache_read_tokens: merged.cache_read_tokens,
    total_cache_write_tokens: merged.cache_write_tokens,
    total_sessions: merged.sessions,
    period_days: days,
    model_usage: modelUsage,
    daily_usage: dailyUsage,
  })
}
