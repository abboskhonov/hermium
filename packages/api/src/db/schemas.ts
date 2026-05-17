import { getDb } from './index.js'

export function initAllHermesTables(): void {
  const db = getDb()

  // Sessions (Web UI local session database)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      source TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      model TEXT,
      provider TEXT,
      message_count INTEGER DEFAULT 0,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      ended_at INTEGER,
      last_active_at INTEGER,
      workspace TEXT
    )
  `)

  // Messages
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      tool_name TEXT,
      tool_call_id TEXT,
      tool_args TEXT,
      tool_result TEXT,
      tool_status TEXT,
      tool_duration REAL,
      is_streaming INTEGER DEFAULT 0,
      reasoning TEXT,
      queued INTEGER DEFAULT 0
    )
  `)

  // Usage analytics
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cache_read_tokens INTEGER DEFAULT 0,
      cache_write_tokens INTEGER DEFAULT 0,
      reasoning_tokens INTEGER DEFAULT 0,
      model TEXT,
      profile TEXT,
      timestamp INTEGER NOT NULL
    )
  `)

  // Scheduled jobs
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cron TEXT NOT NULL,
      command TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      profile TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Job run history
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      status TEXT NOT NULL,
      output TEXT,
      error TEXT,
      started_at INTEGER NOT NULL,
      ended_at INTEGER
    )
  `)

  // Group chat: rooms
  db.exec(`
    CREATE TABLE IF NOT EXISTS gc_rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      invite_code TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Group chat: messages
  db.exec(`
    CREATE TABLE IF NOT EXISTS gc_messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `)

  // Group chat: room agents
  db.exec(`
    CREATE TABLE IF NOT EXISTS gc_room_agents (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      profile TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      invited INTEGER DEFAULT 0
    )
  `)

  // Group chat: room members
  db.exec(`
    CREATE TABLE IF NOT EXISTS gc_room_members (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT,
      joined_at INTEGER NOT NULL,
      online INTEGER DEFAULT 0,
      socket_id TEXT
    )
  `)

  // Indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, timestamp)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_usage_session ON usage(session_id, timestamp)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_gc_messages_room ON gc_messages(room_id, timestamp)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_gc_room_agents_room ON gc_room_agents(room_id)')
}
