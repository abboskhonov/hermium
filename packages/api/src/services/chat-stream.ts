import { logger } from '../lib/logger.js'

// In-memory run storage — ephemeral, per-process
interface RunRequest {
  runId: string
  input: string
  sessionId?: string
  model?: string
  createdAt: number
}

const runs = new Map<string, RunRequest>()

export function createRun(body: {
  input: string
  session_id?: string
  model?: string
}): string {
  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  runs.set(runId, {
    runId,
    input: body.input,
    sessionId: body.session_id,
    model: body.model,
    createdAt: Date.now(),
  })
  // Auto-cleanup after 30 min
  setTimeout(() => runs.delete(runId), 30 * 60 * 1000)
  return runId
}

export function getRun(runId: string): RunRequest | undefined {
  return runs.get(runId)
}

export function deleteRun(runId: string): void {
  runs.delete(runId)
}

// SSE event encoder
export function sseEvent(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

// Mock response generator — streams word-by-word
// TODO: replace with real LLM gateway call
export async function* mockResponseStream(input: string): AsyncGenerator<string> {
  const response = `I received your message: "${input}". This is a mock response from the Hermium API. In production, this stream would come from the Hermes Gateway or an LLM provider endpoint.`
  const words = response.split(' ')
  for (const word of words) {
    await new Promise((r) => setTimeout(r, 60))
    yield word + ' '
  }
}

// Abort controllers for active runs
const abortControllers = new Map<string, AbortController>()

export function setAbortController(runId: string, controller: AbortController): void {
  abortControllers.set(runId, controller)
}

export function abortRun(runId: string): boolean {
  const controller = abortControllers.get(runId)
  if (controller) {
    controller.abort()
    abortControllers.delete(runId)
    logger.info('Run aborted', { run_id: runId })
    return true
  }
  return false
}

export function removeAbortController(runId: string): void {
  abortControllers.delete(runId)
}
