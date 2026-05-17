const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:47474"

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: Record<string, unknown> | null = null
    try {
      body = await res.json()
    } catch {
      // not JSON
    }
    throw new ApiError(
      (body && typeof body.error === "string" ? body.error : res.statusText) ?? "Unknown error",
      res.status,
      typeof body?.code === "string" ? body.code : undefined,
    )
  }
  return res.json() as Promise<T>
}

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`
}

export async function get<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }
  }
  const res = await fetch(url, { credentials: "include", cache: "no-store" })
  return handleResponse<T>(res)
}

export async function post<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body != null ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(res)
}

export async function put<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body != null ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(res)
}

export async function patch<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body != null ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(res)
}

export async function del<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    credentials: "include",
  })
  return handleResponse<T>(res)
}

export async function uploadFile<T = unknown>(
  path: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${BASE_URL}${path}`)
    xhr.withCredentials = true

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as T)
      } else {
        try {
          const body = JSON.parse(xhr.responseText) as Record<string, unknown>
          reject(
            new ApiError(
              typeof body.error === "string" ? body.error : "Upload failed",
              xhr.status,
            ),
          )
        } catch {
          reject(new ApiError("Upload failed", xhr.status))
        }
      }
    })

    xhr.addEventListener("error", () => reject(new ApiError("Network error", 0)))
    xhr.addEventListener("abort", () => reject(new ApiError("Upload aborted", 0)))

    const fd = new FormData()
    fd.append("file", file)
    xhr.send(fd)
  })
}

/**
 * @deprecated This uses EventSource + GET which does not match our POST-based
 * streaming endpoint. Use `postChatStream` from `@/lib/stream` instead.
 * Kept for reference only — will be removed in a future cleanup.
 */
export function streamChat(
  streamId: string,
  onEvent: (event: string, data: unknown) => void,
  onError: (err: Event) => void,
): EventSource {
  const es = new EventSource(`${BASE_URL}/api/chat/stream?stream_id=${encodeURIComponent(streamId)}`, {
    withCredentials: true,
  })

  const eventTypes = ["token", "tool", "tool_start", "tool_end", "reasoning", "approval", "done", "error", "title_status"]

  for (const type of eventTypes) {
    es.addEventListener(type, (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data) as unknown
        onEvent(type, parsed)
      } catch {
        onEvent(type, e.data)
      }
    })
  }

  es.addEventListener("error", (e) => {
    onError(e)
  })

  return es
}
