"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  IconArrowUp,
  IconPhotoScan,
  IconPlayerStop,
} from "@tabler/icons-react";
import { useChatStore } from "@/stores/chat";

export default function ChatInputBlock({
  onCreateSession,
}: {
  onCreateSession?: (id: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const abortStream = useChatStore((s) => s.abortStream);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const activeSessionId = useChatStore((s) => s.activeSessionId);

  const send = async () => {
    const raw = inputValue.trim();
    if (!raw) return;

    // If no active session, create one first
    if (!activeSessionId) {
      const id = await useChatStore.getState().createNewSession();
      if (id && onCreateSession) onCreateSession(id);
    }

    setInputValue("");
    if (inputRef.current) inputRef.current.value = "";

    await sendMessage(raw);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex min-h-[120px] flex-col rounded-2xl cursor-text bg-card border border-border shadow-lg">
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
          <div className="ml-auto flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground transition-colors duration-100 ease-out"
              title="Attach images"
              aria-label="Attach images"
            >
              <IconPhotoScan className="h-5 w-5" />
            </Button>

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
                  inputValue && "bg-primary hover:bg-primary/90!"
                )}
                disabled={!inputValue}
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
