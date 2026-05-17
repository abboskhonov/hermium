import type { ApiResponse } from "@hermium/shared"

const DEFAULT_BASE_URL = "http://localhost:4000"

function getBaseUrl(): string {
  return typeof window !== "undefined"
    ? localStorage.getItem("hermium_server_url") || DEFAULT_BASE_URL
    : ""
}

export function getApiKey(): string {
  return typeof window !== "undefined"
    ? localStorage.getItem("hermium_api_key") || ""
    : ""
}

export function setServerUrl(url: string) {
  localStorage.setItem("hermium_server_url", url)
}

export function setApiKey(key: string) {
  localStorage.setItem("hermium_api_key", key)
}

export function clearApiKey() {
  localStorage.removeItem("hermium_api_key")
}

export function hasApiKey(): boolean {
  return !!getApiKey()
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getBaseUrl()
  const url = `${base}${path}`
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  const apiKey = getApiKey()
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`
  }

  const res = await fetch(url, { ...options, headers })

  // Global 401 handler
  if (res.status === 401 && !path.startsWith("/api/hermes/v1/")) {
    clearApiKey()
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    // If the response is HTML, the API is likely unreachable or a proxy returned a fallback page
    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      throw new Error(
        `API unreachable (HTTP ${res.status}). Is the API server running on :4000?`
      )
    }
    throw new Error(`API Error ${res.status}: ${text || res.statusText}`)
  }

  const json = await res.json()
  // Support both wrapped { data: T } and raw T responses
  const data = (json && typeof json === "object" && "data" in json)
    ? (json as ApiResponse<T>).data
    : (json as T)
  if (json && typeof json === "object" && "error" in json && json.error) {
    throw new Error((json as ApiResponse<T>).error!.message)
  }
  return data as T
}
