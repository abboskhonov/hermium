import { request } from "../client.js"

export interface UsageStatsModelRow {
  model: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  sessions: number
}

export interface UsageStatsDailyRow {
  date: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  sessions: number
  errors: number
}

export interface UsageStatsResponse {
  total_input_tokens: number
  total_output_tokens: number
  total_cache_read_tokens: number
  total_cache_write_tokens: number
  total_sessions: number
  period_days: number
  model_usage: UsageStatsModelRow[]
  daily_usage: UsageStatsDailyRow[]
}

export async function fetchUsageStats(days = 30): Promise<UsageStatsResponse> {
  const params = new URLSearchParams({ days: String(days) })
  return request<UsageStatsResponse>(`/api/hermes/usage/stats?${params}`)
}
