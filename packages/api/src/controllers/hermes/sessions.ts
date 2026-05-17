import type { Context } from 'hono'
import { getDb } from '../../db/index.js'
import { uid } from '../../lib/utils.js'
import type { Session, Message } from '@hermium/shared'

export function listSessions(c: Context) {
  const db = getDb()
  const rows = db.query(`
    SELECT s.*,
      (SELECT content FROM messages WHERE session_id = s.id AND role = 'user' ORDER BY timestamp LIMIT 1) as preview
    FROM sessions s
    ORDER BY s.updated_at DESC
  `).all() as Array<Record<string, unknown>>
  const sessions: Session[] = rows.map((r) => {
    const rawTitle = String(r.title || '')
    const preview = r.preview ? String(r.preview) : ''
    let title = rawTitle
    if (!title && preview) {
      title = preview.slice(0, 40) + (preview.length > 40 ? '...' : '')
    }
    return {
      id: String(r.id),
      title,
      source: r.source ? String(r.source) : undefined,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      model: r.model ? String(r.model) : undefined,
      provider: r.provider ? String(r.provider) : undefined,
      messageCount: Number(r.message_count || 0),
      inputTokens: Number(r.input_tokens || 0),
      outputTokens: Number(r.output_tokens || 0),
      endedAt: r.ended_at ? Number(r.ended_at) : null,
      lastActiveAt: r.last_active_at ? Number(r.last_active_at) : undefined,
      workspace: r.workspace ? String(r.workspace) : null,
    }
  })
  return c.json({ sessions })
}

export function getSession(c: Context) {
  const id = c.req.param('id') ?? ''
  const db = getDb()
  const row = db.query('SELECT * FROM sessions WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!row) return c.json({ error: 'Session not found' }, 404)

  const messages = db.query('SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp').all(id) as Array<Record<string, unknown>>

  const rawTitle = String(row.title || '')
  const firstUserMsg = messages.find((m) => String(m.role) === 'user')
  const preview = firstUserMsg ? String(firstUserMsg.content) : ''
  let title = rawTitle
  if (!title && preview) {
    title = preview.slice(0, 40) + (preview.length > 40 ? '...' : '')
  }

  return c.json({
    session: {
      id: String(row.id),
      title,
      source: row.source ? String(row.source) : undefined,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      model: row.model ? String(row.model) : undefined,
      provider: row.provider ? String(row.provider) : undefined,
      messageCount: Number(row.message_count || 0),
      inputTokens: Number(row.input_tokens || 0),
      outputTokens: Number(row.output_tokens || 0),
      endedAt: row.ended_at ? Number(row.ended_at) : null,
      lastActiveAt: row.last_active_at ? Number(row.last_active_at) : undefined,
      workspace: row.workspace ? String(row.workspace) : null,
    },
    messages: messages.map((m) => {
      let toolCalls: import('@hermium/shared').ToolCall[] | undefined
      if (m.tool_calls) {
        try {
          toolCalls = JSON.parse(String(m.tool_calls))
        } catch { /* skip */ }
      }
      return {
        id: String(m.id),
        role: String(m.role) as Message['role'],
        content: String(m.content),
        timestamp: Number(m.timestamp),
        attachments: m.attachments ? JSON.parse(String(m.attachments)) : undefined,
        toolName: m.tool_name ? String(m.tool_name) : undefined,
        toolCallId: m.tool_call_id ? String(m.tool_call_id) : undefined,
        toolArgs: m.tool_args ? String(m.tool_args) : undefined,
        toolResult: m.tool_result ? String(m.tool_result) : undefined,
        toolStatus: m.tool_status ? String(m.tool_status) as 'running' | 'done' | 'error' : undefined,
        toolDuration: m.tool_duration ? Number(m.tool_duration) : undefined,
        isStreaming: Boolean(m.is_streaming),
        reasoning: m.reasoning ? String(m.reasoning) : undefined,
        reasoningStartedAt: m.reasoning_started_at ? Number(m.reasoning_started_at) : undefined,
        reasoningEndedAt: m.reasoning_ended_at ? Number(m.reasoning_ended_at) : undefined,
        toolCalls,
        queued: Boolean(m.queued),
      }
    }),
  })
}

export async function createSession(c: Context) {
  const body = await c.req.json<{ id?: string; title?: string; model?: string; source?: string }>()
  const db = getDb()
  const id = body.id || uid()
  const now = Date.now()
  const title = body.title ?? ''
  db.run(
    'INSERT INTO sessions (id, title, source, created_at, updated_at, model) VALUES (?, ?, ?, ?, ?, ?)',
    [id, title, body.source ?? null, now, now, body.model ?? null]
  )
  return c.json({ id, title, createdAt: now, updatedAt: now })
}

export async function updateSession(c: Context) {
  const id = c.req.param('id') ?? ''
  const body = await c.req.json<Partial<Session>>()
  const db = getDb()

  const fields: string[] = []
  const values: (string | number | null)[] = []

  if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title) }
  if (body.model !== undefined) { fields.push('model = ?'); values.push(body.model) }
  if (body.updatedAt !== undefined) { fields.push('updated_at = ?'); values.push(body.updatedAt) }

  if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400)

  values.push(id)
  db.run(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`, values)
  return c.json({ ok: true })
}

export function deleteSession(c: Context) {
  const id = c.req.param('id') ?? ''
  const db = getDb()
  db.run('DELETE FROM messages WHERE session_id = ?', [id])
  db.run('DELETE FROM sessions WHERE id = ?', [id])
  return c.json({ ok: true })
}

export async function renameSession(c: Context) {
  const id = c.req.param('id') ?? ''
  const body = await c.req.json<{ title: string }>()
  const db = getDb()
  const now = Date.now()
  db.run('UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?', [body.title, now, id])
  return c.json({ ok: true })
}

export async function addMessage(c: Context) {
  const sessionId = c.req.param('id') ?? ''
  const body = await c.req.json<Message & { session_id?: string }>()
  const db = getDb()

  // Upsert message
  db.run(
    `INSERT OR REPLACE INTO messages (
      id, session_id, role, content, timestamp,
      tool_name, tool_call_id, tool_args, tool_result, tool_status, tool_duration,
      is_streaming, reasoning, reasoning_started_at, reasoning_ended_at, tool_calls, queued, attachments
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      body.id,
      sessionId,
      body.role,
      body.content,
      body.timestamp,
      body.toolName ?? null,
      body.toolCallId ?? null,
      body.toolArgs ?? null,
      body.toolResult ?? null,
      body.toolStatus ?? null,
      body.toolDuration ?? null,
      body.isStreaming ? 1 : 0,
      body.reasoning ?? null,
      body.reasoningStartedAt ?? null,
      body.reasoningEndedAt ?? null,
      body.toolCalls ? JSON.stringify(body.toolCalls) : null,
      body.queued ? 1 : 0,
      body.attachments ? JSON.stringify(body.attachments) : null,
    ]
  )

  // Update session message count and last active
  db.run(
    `UPDATE sessions SET
      message_count = (SELECT COUNT(*) FROM messages WHERE session_id = ?),
      updated_at = ?,
      last_active_at = ?
    WHERE id = ?`,
    [sessionId, Date.now(), Date.now(), sessionId]
  )

  return c.json({ ok: true })
}


