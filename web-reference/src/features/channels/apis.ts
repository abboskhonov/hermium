import { get as apiGet, put } from "@/lib/api"
import type { EnvVarsResponse, HermesConfig } from "./types"

export async function fetchConfig(): Promise<HermesConfig> {
  return apiGet<HermesConfig>("/api/config")
}

export async function fetchEnvVars(): Promise<EnvVarsResponse> {
  return apiGet<EnvVarsResponse>("/api/env")
}

export async function updateConfig(config: HermesConfig) {
  return put("/api/config", { config })
}

export async function updateEnvVar(key: string, value: string) {
  return put("/api/env", { key, value })
}
