import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  IconArrowUp,
  IconPaperclip,
  IconPlayerStop,
  IconCommand,
  IconX,
} from "@tabler/icons-react"
import { isImeComposing } from "./keyboard"
import { SLASH_COMMANDS } from "./slashCommands"
import type { SlashCommand } from "./types"
import { useInputHistory } from "./hooks/useInputHistory"
import type { Attachment } from "./types"
import { AttachmentPreview } from "./components/AttachmentPreview"

export interface ChatInputHandle {
  setText(text: string): void
  clear(): void
  focus(): void
}

interface ChatInputProps {
  sessionId: string
  isLoading: boolean
  onSubmit: (text: string, attachments?: Attachment[]) => void
  onAbort: () => void
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  function ChatInput({ sessionId, isLoading, onSubmit, onAbort }, ref): React.JSX.Element {
    const [input, setInput] = useState("")
    const [isComposing, setIsComposing] = useState(false)
    const [slashMenuOpen, setSlashMenuOpen] = useState(false)
    const [slashFilter, setSlashFilter] = useState("")
    const [slashSelectedIndex, setSlashSelectedIndex] = useState(0)
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [isDragOver, setIsDragOver] = useState(false)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const slashMenuRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Auto-resize
    const autoResize = useCallback(() => {
      const el = inputRef.current
      if (!el) return
      el.style.height = "auto"
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`
    }, [])

    const applyHistoryText = useCallback(
      (text: string) => {
        setInput(text)
        requestAnimationFrame(() => {
          autoResize()
          inputRef.current?.setSelectionRange(text.length, text.length)
        })
      },
      [autoResize],
    )

    const history = useInputHistory({ currentInput: input, applyText: applyHistoryText })

    useImperativeHandle(
      ref,
      () => ({
        setText(text: string) {
          setInput(text)
          requestAnimationFrame(() => {
            autoResize()
            inputRef.current?.focus()
          })
        },
        clear() {
          setInput("")
          if (inputRef.current) inputRef.current.style.height = "auto"
        },
        focus() {
          inputRef.current?.focus()
        },
      }),
      [autoResize],
    )

    // Refocus when streaming ends
    useEffect(() => {
      if (!isLoading) inputRef.current?.focus()
    }, [isLoading])

    // Click outside to close slash menu
    useEffect(() => {
      if (!slashMenuOpen) return
      function handleClick(e: MouseEvent) {
        if (slashMenuRef.current && !slashMenuRef.current.contains(e.target as Node)) {
          setSlashMenuOpen(false)
        }
      }
      document.addEventListener("mousedown", handleClick)
      return () => document.removeEventListener("mousedown", handleClick)
    }, [slashMenuOpen])

    // Scroll active slash item into view
    useEffect(() => {
      if (!slashMenuOpen) return
      const active = slashMenuRef.current?.querySelector(".slash-item-active")
      active?.scrollIntoView({ block: "nearest" })
    }, [slashSelectedIndex, slashMenuOpen])

    const filteredCommands = useMemo(
      () =>
        slashMenuOpen
          ? SLASH_COMMANDS.filter((cmd) =>
              cmd.name.toLowerCase().startsWith(slashFilter.toLowerCase()),
            )
          : [],
      [slashMenuOpen, slashFilter],
    )

    // ── File / attachment helpers ─────────────────────────────────────

    const addFiles = useCallback((files: FileList | File[]) => {
      const newAttachments: Attachment[] = Array.from(files).map((file) => ({
        id: uid(),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }))
      setAttachments((prev) => [...prev, ...newAttachments])
    }, [])

    const removeAttachment = useCallback((id: string) => {
      setAttachments((prev) => {
        const removed = prev.find((a) => a.id === id)
        if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
        return prev.filter((a) => a.id !== id)
      })
    }, [])

    // Clean up previews on unmount
    useEffect(() => {
      return () => {
        attachments.forEach((a) => {
          if (a.previewUrl) URL.revokeObjectURL(a.previewUrl)
        })
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ── Drag & drop ─────────────────────────────────────────────────

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsDragOver(false)
      }
    }, [])

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
        if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
      },
      [addFiles],
    )

    // ── Paste images ────────────────────────────────────────────────

    const handlePaste = useCallback(
      (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData?.items
        if (!items) return
        const imageFiles: File[] = []
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile()
            if (file) {
              const ext = item.type.split("/")[1] || "png"
              const renamed = new File([file], `pasted-image-${Date.now()}.${ext}`, {
                type: item.type,
              })
              imageFiles.push(renamed)
            }
          }
        }
        if (imageFiles.length > 0) {
          e.preventDefault()
          addFiles(imageFiles)
        }
      },
      [addFiles],
    )

    // ── Send logic ────────────────────────────────────────────────────

    function clearAfterSend(text: string) {
      history.push(text)
      setInput("")
      if (inputRef.current) inputRef.current.style.height = "auto"
    }

    function handleSend() {
      const text = input.trim()
      if (!text || isLoading) return
      setSlashMenuOpen(false)
      clearAfterSend(text)
      onSubmit(text, attachments)
      setAttachments([])
    }

    function handleSlashSelect(cmd: SlashCommand) {
      setSlashMenuOpen(false)
      if (cmd.local || cmd.category === "info") {
        setInput("")
        if (inputRef.current) inputRef.current.style.height = "auto"
        onSubmit(cmd.name)
        return
      }
      setInput(cmd.name + " ")
      inputRef.current?.focus()
    }

    function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      const value = e.target.value
      setInput(value)
      autoResize()

      if (value.startsWith("/") && !value.includes(" ")) {
        setSlashMenuOpen(true)
        setSlashFilter(value)
        setSlashSelectedIndex(0)
      } else if (slashMenuOpen) {
        setSlashMenuOpen(false)
      }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (isImeComposing(e)) return

      // Slash menu navigation
      if (slashMenuOpen && filteredCommands.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault()
          setSlashSelectedIndex((i) =>
            i < filteredCommands.length - 1 ? i + 1 : 0,
          )
          return
        }
        if (e.key === "ArrowUp") {
          e.preventDefault()
          setSlashSelectedIndex((i) =>
            i > 0 ? i - 1 : filteredCommands.length - 1,
          )
          return
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault()
          handleSlashSelect(filteredCommands[slashSelectedIndex])
          return
        }
        if (e.key === "Escape") {
          e.preventDefault()
          setSlashMenuOpen(false)
          return
        }
      }

      // History navigation
      if (!slashMenuOpen && (history.isNavigating() || !input.includes("\n"))) {
        if (e.key === "ArrowUp" && history.size() > 0) {
          if (history.recallPrev()) {
            e.preventDefault()
            return
          }
        }
        if (e.key === "ArrowDown" && history.isNavigating()) {
          if (history.recallNext()) {
            e.preventDefault()
            return
          }
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    }

    const canSend = input.trim().length > 0

    return (
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-2 relative ">
        {/* Slash command menu */}
        {slashMenuOpen && filteredCommands.length > 0 && (
          <div
            ref={slashMenuRef}
            className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden"
          >
            <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium text-muted-foreground border-b border-border/60 bg-muted/30">
              <IconCommand className="size-3" />
              Commands
            </div>
            <div className="max-h-[240px] overflow-y-auto py-1">
              {filteredCommands.map((cmd, i) => (
                <button
                  key={cmd.name}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left",
                    i === slashSelectedIndex
                      ? "bg-accent text-accent-foreground slash-item-active"
                      : "hover:bg-accent/50",
                  )}
                  onMouseEnter={() => setSlashSelectedIndex(i)}
                  onClick={() => handleSlashSelect(cmd)}
                >
                  <span className="font-mono text-xs text-primary">{cmd.name}</span>
                  <span className="text-muted-foreground text-xs">{cmd.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          className={cn(
            "flex min-h-[80px] flex-col rounded-2xl cursor-text bg-card border shadow-lg transition-colors",
            isDragOver ? "border-primary border-dashed" : "border-border",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <AttachmentPreview
            attachments={attachments}
            onRemove={removeAttachment}
            compact
          />
          <div className="flex-1 relative overflow-y-auto max-h-[200px]">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="Ask anything…"
              rows={1}
              className={cn(
                "w-full !rounded-none border-0 p-3 outline-none text-[15px] text-foreground resize-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent bg-transparent whitespace-pre-wrap break-words",
                "min-h-[48px] max-h-[200px]",
              )}
            />
          </div>

          <div className="flex min-h-[40px] items-center gap-2 p-2 pb-1">
            {/* Attach */}
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Attach images"
              onClick={() => fileInputRef.current?.click()}
            >
              <IconPaperclip className="h-5 w-5" />
            </Button>

            <div className="ml-auto flex items-center gap-2">
              {isLoading ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors cursor-pointer"
                  onClick={onAbort}
                  title="Stop generating"
                >
                  <IconPlayerStop className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    "rounded-full transition-colors cursor-pointer",
                    canSend
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "bg-primary text-primary-foreground opacity-40",
                  )}
                  disabled={!canSend}
                  onClick={handleSend}
                  title="Send message"
                >
                  <IconArrowUp className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              addFiles(e.target.files)
              e.target.value = ""
            }
          }}
        />
      </div>
    )
  },
)
