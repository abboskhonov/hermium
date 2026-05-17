import { get } from "@/lib/api"
import type { InsightsResponse } from "./types"

export function fetchUsage(days: number = 30): Promise<InsightsResponse> {
  return get<InsightsResponse>(`/api/hermes/insights?days=${days}`)
}
