"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  IconArrowUp,
  IconPhotoScan,
  IconPlayerStop,
  IconPaperclip,
  IconX,
  IconFile,
} from "@tabler/icons-react";
import { useChatStore } from "@/stores/chat";

interface PendingAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  file: File;
}

export default function ChatInputBlock({
  onCreateSession,
}: {
  onCreateSession?: (id: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const abortStream = useChatStore((s) => s.abortStream);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const activeSessionId = useChatStore((s) => s.activeSessionId);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const newAttachments: PendingAttachment[] = [];
    for (const file of Array.from(files)) {
      newAttachments.push({
        id: Math.random().toString(36).slice(2),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        url: URL.createObjectURL(file),
        file,
      });
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att) URL.revokeObjectURL(att.url);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const send = async () => {
    const raw = inputValue.trim();
    if (!raw && attachments.length === 0) return;

    // If we're in "new chat" mode (landing page), always create a fresh session
    if (onCreateSession) {
      const id = await useChatStore.getState().createNewSession();
      if (id) {
        onCreateSession(id);
        setInputValue("");
        if (inputRef.current) inputRef.current.value = "";
        const atts = attachments.length > 0 ? attachments : undefined;
        setAttachments([]);
        await sendMessage(raw, undefined, atts);
      }
      return;
    }

    // Existing chat session mode
    if (!activeSessionId) {
      const id = await useChatStore.getState().createNewSession();
      if (!id) return;
    }

    setInputValue("");
    if (inputRef.current) inputRef.current.value = "";

    const atts = attachments.length > 0 ? attachments : undefined;
    setAttachments([]);

    await sendMessage(raw, undefined, atts);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (type: string) => type.startsWith("image/");

  return (
    <div className="flex flex-col gap-2 w-full">
      <div
        className={cn(
          "flex min-h-[120px] flex-col rounded-2xl cursor-text bg-card border border-border shadow-lg transition-colors",
          isDragging && "border-primary ring-2 ring-primary/20",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 pb-0">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="group relative flex items-center gap-2 rounded-lg border bg-muted/50 px-2 py-1.5 pr-7 text-xs"
              >
                {isImage(att.type) ? (
                  <img
                    src={att.url}
                    alt={att.name}
                    className="h-6 w-6 rounded object-cover"
                  />
                ) : (
                  <IconFile className="size-4 text-muted-foreground shrink-0" />
                )}
                <span className="truncate max-w-[120px]">{att.name}</span>
                <span className="text-muted-foreground/60">{formatSize(att.size)}</span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center rounded p-0.5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <IconX className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 relative overflow-y-auto max-h-[258px]">
          <Textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything"
            className="w-full border-0 p-3 transition-[padding] duration-200 ease-in-out min-h-[48.4px] outline-none text-[16px] text-foreground resize-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent! whitespace-pre-wrap break-words"
          />
        </div>

        <div className="flex min-h-[40px] items-center gap-2 p-2 pb-1">
          {/* Left: file attachment button */}
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground transition-colors duration-100 ease-out"
              title="Attach files"
              aria-label="Attach files"
              onClick={() => fileInputRef.current?.click()}
            >
              <IconPaperclip className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground transition-colors duration-100 ease-out"
              title="Attach images"
              aria-label="Attach images"
              onClick={() => fileInputRef.current?.click()}
            >
              <IconPhotoScan className="h-5 w-5" />
            </Button>
          </div>

          {/* Right: send / stop */}
          <div className="ml-auto flex items-center gap-3">
            {isStreaming ? (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={abortStream}
                className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors cursor-pointer"
                title="Stop generating"
                aria-label="Stop generating"
              >
                <IconPlayerStop className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={send}
                className={cn(
                  "rounded-full transition-colors duration-100 ease-out cursor-pointer bg-primary",
                  (inputValue || attachments.length > 0) && "bg-primary hover:bg-primary/90!"
                )}
                disabled={!inputValue && attachments.length === 0}
                aria-label="Send message"
              >
                <IconArrowUp className="h-4 w-4 text-primary-foreground" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
