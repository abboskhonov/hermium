export interface InsightsModelEntry {
  model: string
  sessions: number
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost: number
  session_share: number
  token_share: number
  cost_share: number
}

export interface InsightsDailyEntry {
  date: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  cache_hit_rate: number
  sessions: number
  cost: number
}

export interface InsightsDayOfWeek {
  day: string
  sessions: number
}

export interface InsightsHourOfDay {
  hour: number
  sessions: number
}

export interface InsightsResponse {
  period_days: number
  total_sessions: number
  total_messages: number
  total_input_tokens: number
  total_output_tokens: number
  total_tokens: number
  total_cost: number
  cache_hit_rate: number
  total_cache_read: number
  total_cache_write: number
  models: InsightsModelEntry[]
  daily_tokens: InsightsDailyEntry[]
  activity_by_day: InsightsDayOfWeek[]
  activity_by_hour: InsightsHourOfDay[]
}
