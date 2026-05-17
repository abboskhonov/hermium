import { useQuery, useMutation } from "@tanstack/react-query"
import { get, post } from "@/lib/api"

export interface VersionInfo {
  current: string
  latest: string | null
  outdated: boolean
  updateCommand: string | null
}

export interface UpdateResult {
  success: boolean
  message: string
  version?: string
  command?: string
  stderr?: string
  error?: string
}

export async function fetchVersion(): Promise<VersionInfo> {
  return get("/api/version")
}

export async function triggerUpdate(): Promise<UpdateResult> {
  return post("/api/update")
}

export function useVersionCheck() {
  return useQuery({
    queryKey: ["version"],
    queryFn: fetchVersion,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // poll every 5 minutes
    refetchIntervalInBackground: false,
    retry: 2,
  })
}

export function useTriggerUpdate() {
  return useMutation({
    mutationFn: triggerUpdate,
  })
}
