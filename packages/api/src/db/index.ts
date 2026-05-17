import { Database } from 'bun:sqlite'
import { config } from '../config.js'
import { logger } from '../lib/logger.js'

let dbInstance: Database | null = null

export function getDb(): Database {
  if (!dbInstance) {
    dbInstance = new Database(config.dbPath, { create: true })
    dbInstance.exec('PRAGMA journal_mode = WAL')
    logger.info(`SQLite opened at ${config.dbPath}`)
  }
  return dbInstance
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
    logger.info('SQLite closed')
  }
}
