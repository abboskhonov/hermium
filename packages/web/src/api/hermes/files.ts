// File upload uses fetch directly for FormData support

export async function uploadFiles(files: File[]): Promise<{ name: string; path: string }[]> {
  const formData = new FormData()
  for (const file of files) {
    formData.append("file", file)
  }
  const res = await fetch("/api/hermes/files/upload", {
    method: "POST",
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(body.error || `Upload failed: ${res.status}`)
  }
  const data = await res.json() as { files: { name: string; path: string }[] }
  return data.files
}

export function getFileDownloadUrl(relativePath: string, fileName?: string): string {
  const params = new URLSearchParams({ path: relativePath })
  if (fileName) params.set("name", fileName)
  return `/api/hermes/download?${params.toString()}`
}
