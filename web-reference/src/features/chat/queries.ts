import { useMutation, useQuery } from "@tanstack/react-query"
import {
  startChat,
  listSessions,
  createSession,
  deleteSessionApi,
  respondApproval,
  checkPendingApproval,
  fetchModels,
} from "./apis"

export function useStartChat() {
  return useMutation({
    mutationFn: startChat,
  })
}

/**
 * @deprecated The sidebar reads sessions from Zustand (loadSessions),
 * not TanStack Query. This hook is no longer consumed anywhere.
 * Kept for reference — remove in cleanup.
 */
export function useListSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: () => listSessions(),
    staleTime: 10_000,
    refetchInterval: 30_000,      // 30s — was 5s, way too aggressive
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })
}

/**
 * @deprecated The chat flow creates sessions locally via Zustand
 * (createAndSwitchSession / newChat) without API pre-creation.
 * This hook is no longer consumed anywhere.
 * Kept for reference — remove in cleanup.
 */
export function useCreateSession() {
  return useMutation({
    mutationFn: createSession,
  })
}

export function useDeleteSession() {
  return useMutation({
    mutationFn: deleteSessionApi,
  })
}

export function useRespondApproval() {
  return useMutation({
    mutationFn: respondApproval,
  })
}

export function usePendingApproval(sessionId: string | null) {
  return useQuery({
    queryKey: ["approval", "pending", sessionId],
    queryFn: () => checkPendingApproval(sessionId!),
    enabled: !!sessionId,
    refetchInterval: 5_000,       // 5s — was 1.5s
    refetchIntervalInBackground: false,
  })
}

export function useModels() {
  return useQuery({
    queryKey: ["models"],
    queryFn: fetchModels,
    staleTime: 300_000,           // 5min — models don't change often
    gcTime: 600_000,              // 10min
    refetchOnWindowFocus: false,
  })
}
