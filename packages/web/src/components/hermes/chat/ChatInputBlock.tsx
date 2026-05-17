"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  IconArrowUp,
  IconPhotoScan,
} from "@tabler/icons-react";
import { useChatStore } from "@/stores/chat";
import { runChat, streamChatRun } from "@/api/hermes/chat";
import { saveMessage } from "@/api/hermes/sessions";

export default function ChatInputBlock({
  onCreateSession,
}: {
  onCreateSession?: (id: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    activeSessionId,
    appendMessage,
    setStreaming,
    createNewSession,
    saveAndAppendMessage,
    updateSessionTitle,
  } = useChatStore();

  const send = useCallback(async () => {
    const raw = inputValue.trim();
    if (!raw) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await createNewSession();
      if (sessionId && onCreateSession) {
        onCreateSession(sessionId);
      }
    }
    if (!sessionId) return;

    const userMsg: import("@hermium/shared").Message = {
      id: Date.now().toString(36),
      role: "user",
      content: raw,
      timestamp: Date.now(),
    };

    await saveAndAppendMessage(sessionId, userMsg);
    updateSessionTitle(sessionId);

    setInputValue("");
    if (inputRef.current) inputRef.current.value = "";
    setStreaming(true);

    try {
      const { run_id } = await runChat({
        input: raw,
        session_id: sessionId,
      });

      const assistantId = Date.now().toString(36) + "_ai";
      appendMessage({
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isStreaming: true,
      });

      streamChatRun(run_id, {
        onEvent: (event) => {
          if (event.event === "message.delta" && event.delta) {
            const state = useChatStore.getState();
            const msg = state.messages.find((m) => m.id === assistantId);
            if (msg) {
              const nextContent = msg.content + event.delta;
              useChatStore.setState({
                messages: state.messages.map((m) =>
                  m.id === assistantId ? { ...m, content: nextContent } : m
                ),
              });
            }
          }
          if (event.event === "run.completed") {
            const state = useChatStore.getState();
            const finalMsg = state.messages.find((m) => m.id === assistantId);
            if (finalMsg) {
              useChatStore.setState({
                messages: state.messages.map((m) =>
                  m.id === assistantId ? { ...m, isStreaming: false } : m
                ),
              });
              saveMessage(sessionId!, {
                ...finalMsg,
                isStreaming: false,
              }).catch(console.error);
            }
            setStreaming(false);
          }
          if (event.event === "run.error") {
            const state = useChatStore.getState();
            useChatStore.setState({
              messages: state.messages.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      role: "system",
                      content: event.error || "Stream error",
                      systemType: "error",
                      isStreaming: false,
                    }
                  : m
              ),
            });
            setStreaming(false);
          }
        },
        onError: (err) => {
          appendMessage({
            id: Date.now().toString(36) + "_err",
            role: "system",
            content: err.message,
            timestamp: Date.now(),
            systemType: "error",
          });
          setStreaming(false);
        },
        onClose: () => setStreaming(false),
      });
    } catch (err) {
      appendMessage({
        id: Date.now().toString(36) + "_err",
        role: "system",
        content: err instanceof Error ? err.message : "Unknown error",
        timestamp: Date.now(),
        systemType: "error",
      });
      setStreaming(false);
    }
  }, [inputValue, activeSessionId, appendMessage, createNewSession, saveAndAppendMessage, setStreaming, updateSessionTitle, onCreateSession]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col gap-4 w-[40rem] mx-auto">
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
          </div>
        </div>
      </div>
    </div>
  );
}
