import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchSessions,
  fetchSession,
  createSession,
  updateSession,
  deleteSession,
  searchSessions,
} from "./apis"

export const sessionKeys = {
  all: ["sessions"] as const,
  list: () => [...sessionKeys.all, "list"] as const,
  detail: (id: string) => [...sessionKeys.all, "detail", id] as const,
  search: (q: string) => [...sessionKeys.all, "search", q] as const,
}

export function useSessions() {
  return useQuery({
    queryKey: sessionKeys.list(),
    queryFn: fetchSessions,
    staleTime: 10_000,
  })
}

export function useSession(sessionId: string | null) {
  return useQuery({
    queryKey: sessionKeys.detail(sessionId ?? ""),
    queryFn: () => fetchSession(sessionId!),
    enabled: !!sessionId,
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sessionKeys.list() })
    },
  })
}

export function useUpdateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateSession,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sessionKeys.list() })
    },
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sessionKeys.list() })
    },
  })
}

export function useSearchSessions(query: string) {
  return useQuery({
    queryKey: sessionKeys.search(query),
    queryFn: () => searchSessions(query),
    enabled: query.length > 0,
    staleTime: 5_000,
  })
}
