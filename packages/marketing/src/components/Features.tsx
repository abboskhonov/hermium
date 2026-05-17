import {
  IconArrowDown,
  IconLock,
  IconMessages,
  IconPaperclip,
  IconServer,
} from "@tabler/icons-react"

export function Features() {
  return (
    <>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes slideInDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(23, 23, 23, 0.12); }
          50% { box-shadow: 0 0 0 8px rgba(23, 23, 23, 0); }
        }
        @keyframes slowPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes typingLine {
          from { opacity: 0; clip-path: inset(0 100% 0 0); }
          to { opacity: 1; clip-path: inset(0 0 0 0); }
        }

        /* Card 1: Self-hosted — live badge pulses slowly, lock fades in */
        .feature-card:hover .live-badge {
          animation: pulseGlow 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .feature-card:hover .lock-hint {
          animation: fadeIn 800ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          opacity: 0;
        }
        .feature-card:hover .local-server {
          animation: breathe 3s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        /* Card 2: Chat — cursor blinks slowly, code block breathes */
        .feature-card:hover .stream-cursor {
          animation: blink 1.2s step-end infinite;
        }
        .feature-card:hover .code-block {
          animation: breathe 4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        /* Card 3: Files — pills drop in with stagger, slow */
        .feature-card:hover .file-pill {
          animation: slideInDown 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          opacity: 0;
        }
        .feature-card:hover .file-pill:nth-child(1) { animation-delay: 0ms; }
        .feature-card:hover .file-pill:nth-child(2) { animation-delay: 200ms; }
        .feature-card:hover .file-pill:nth-child(3) { animation-delay: 400ms; }
        .feature-card:hover .drop-zone {
          animation: slowPulse 3s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        /* Card 4: Model switch — active reasoning pill glows slowly */
        .feature-card:hover .reason-pill-active {
          animation: pulseGlow 2.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .feature-card:hover .model-arrow {
          animation: slideInDown 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .feature-card:hover .reason-row {
          animation: slideInRight 500ms cubic-bezier(0.22, 1, 0.36, 1) 200ms forwards;
          opacity: 0;
        }

        /* Card 5: Sessions — list items stagger in slowly */
        .feature-card:hover .session-item {
          animation: slideInRight 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          opacity: 0;
        }
        .feature-card:hover .session-item:nth-child(1) { animation-delay: 0ms; }
        .feature-card:hover .session-item:nth-child(2) { animation-delay: 180ms; }
        .feature-card:hover .session-item:nth-child(3) { animation-delay: 360ms; }

        /* Card 6: Terminal — server line types in slowly, cursor blinks */
        .feature-card:hover .terminal-cursor {
          animation: blink 1.2s step-end infinite;
        }
        .feature-card:hover .terminal-reveal {
          animation: typingLine 900ms cubic-bezier(0.22, 1, 0.36, 1) 400ms forwards;
          opacity: 0;
        }

        @media (prefers-reduced-motion: reduce) {
          .live-badge, .lock-hint, .local-server, .stream-cursor, .code-block,
          .file-pill, .drop-zone, .reason-pill-active, .model-arrow, .reason-row,
          .session-item, .terminal-cursor, .terminal-reveal {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <section id="features" className="relative w-full py-16 md:py-24">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10 lg:px-14">
          {/* Heading */}
          <div className="mx-auto max-w-[640px] text-center">
            <h2
              className="text-[clamp(1.75rem,3vw,2.25rem)] font-normal leading-[1.15] tracking-[-0.01em] text-[#0F0F0F]"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              Everything you need to talk to your agent
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[#666666]">
              Hermium is a clean, fast chat interface built specifically for the Hermes agent. No fluff, no lock-in.
            </p>
          </div>

          {/* Grid */}
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* 1. Self-hosted */}
            <div className="feature-card group flex flex-col overflow-hidden rounded-2xl border border-[#F2F2F2] bg-[#FAFAFA] transition-colors hover:border-[#E5E5E5] hover:bg-white">
              <div className="flex min-h-[200px] items-center justify-center bg-[#F5F5F5] p-5 group-hover:bg-[#FAFAFA]">
                <div className="flex flex-col items-center justify-center gap-3 p-2">
                  <div className="local-server live-badge flex items-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-4 py-2.5 text-xs shadow-sm">
                    <IconServer className="h-4 w-4 text-[#171717]" stroke={1.5} />
                    <span className="font-mono text-[#0F0F0F]">http://localhost:42424</span>
                    <span className="ml-1 rounded bg-[#171717] px-1.5 py-0.5 text-[10px] text-white">live</span>
                  </div>
                  <div className="lock-hint flex items-center gap-1.5 text-[10px] text-[#8A8A8A]">
                    <IconLock className="h-3 w-3" stroke={2} />
                    <span>No cloud · No accounts · No tracking</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-sm font-semibold text-[#0F0F0F]">Self-hosted. Your data never leaves.</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#666666]">
                  Run everything locally. No cloud accounts, no telemetry, no external APIs phoning home. Just you, your machine, and your agent.
                </p>
              </div>
            </div>

            {/* 2. Chat with markdown */}
            <div className="feature-card group flex flex-col overflow-hidden rounded-2xl border border-[#F2F2F2] bg-[#FAFAFA] transition-colors hover:border-[#E5E5E5] hover:bg-white">
              <div className="flex min-h-[200px] items-center justify-center bg-[#F5F5F5] p-5 group-hover:bg-[#FAFAFA]">
                <div className="flex w-full flex-col gap-2 p-1">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#171717] px-3 py-2 text-[11px] text-[#F7F7F7]">
                      Refactor this to use hooks
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-[#E5E5E5] bg-white px-3 py-2 text-[11px] text-[#0F0F0F] shadow-sm">
                      <div className="mb-1 font-medium">Here's the refactored version:</div>
                      <div className="code-block overflow-hidden rounded-md bg-[#F5F5F5] px-2 py-1.5 font-mono text-[10px] leading-relaxed text-[#0F0F0F]">
                        <span className="text-[#8A8A8A]">const</span>{" "}
                        <span className="font-medium text-[#171717]">useData</span>
                        <span className="text-[#8A8A8A]"> = () =&gt; {"{"}</span>
                        <br />
                        <span className="text-[#8A8A8A]">&nbsp;&nbsp;const</span>{" "}
                        <span className="text-[#171717]">[data, setData]</span>
                        <span className="text-[#8A8A8A]"> = </span>
                        <span className="font-medium text-[#171717]">useState</span>
                        <span className="text-[#8A8A8A]">();</span>
                        <br />
                        <span className="text-[#8A8A8A]">{"}"};</span>
                        <span className="stream-cursor inline-block h-3 w-0.5 bg-[#171717] align-middle" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-sm font-semibold text-[#0F0F0F]">Chat with markdown, code, and streaming</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#666666]">
                  Full markdown rendering with syntax-highlighted code blocks, streaming responses in real-time, and keyboard shortcuts for power users.
                </p>
              </div>
            </div>

            {/* 3. Drop files */}
            <div className="feature-card group flex flex-col overflow-hidden rounded-2xl border border-[#F2F2F2] bg-[#FAFAFA] transition-colors hover:border-[#E5E5E5] hover:bg-white">
              <div className="flex min-h-[200px] items-center justify-center bg-[#F5F5F5] p-5 group-hover:bg-[#FAFAFA]">
                <div className="flex flex-col items-center justify-center gap-2.5 p-2">
                  <div className="file-pill flex items-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-xs shadow-sm">
                    <IconPaperclip className="h-4 w-4 text-[#171717]" stroke={1.5} />
                    <span className="text-[#0F0F0F]">store.ts</span>
                    <span className="text-[#8A8A8A]">· 4.2 KB</span>
                  </div>
                  <div className="file-pill flex items-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-xs shadow-sm">
                    <IconPaperclip className="h-4 w-4 text-[#171717]" stroke={1.5} />
                    <span className="text-[#0F0F0F]">README.md</span>
                    <span className="text-[#8A8A8A]">· 12 KB</span>
                  </div>
                  <div className="file-pill drop-zone rounded-full border border-dashed border-[#D4D4D4] px-4 py-1.5 text-[10px] text-[#8A8A8A]">
                    Drop files here
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-sm font-semibold text-[#0F0F0F]">Drop files into the chat</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#666666]">
                  Attach any file — code, documents, images — and the agent reads them inline. It can edit, reference, or execute code from what you upload.
                </p>
              </div>
            </div>

            {/* 4. Switch models */}
            <div className="feature-card group flex flex-col overflow-hidden rounded-2xl border border-[#F2F2F2] bg-[#FAFAFA] transition-colors hover:border-[#E5E5E5] hover:bg-white">
              <div className="flex min-h-[200px] items-center justify-center bg-[#F5F5F5] p-5 group-hover:bg-[#FAFAFA]">
                <div className="flex flex-col items-center justify-center gap-3 p-2">
                  <div className="model-arrow flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs shadow-sm">
                    <span className="font-medium text-[#0F0F0F]">claude-sonnet-4</span>
                    <IconArrowDown className="h-3 w-3 text-[#8A8A8A]" stroke={2} />
                  </div>
                  <div className="reason-row flex gap-1">
                    {["off", "low", "med", "high", "xhigh"].map((l) => (
                      <span
                        key={l}
                        className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                          l === "high"
                            ? "reason-pill-active bg-[#171717] text-white"
                            : "bg-[#F5F5F5] text-[#8A8A8A]"
                        }`}
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-sm font-semibold text-[#0F0F0F]">Switch models mid-conversation</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#666666]">
                  Change the active model without starting over. Toggle reasoning depth from off to xhigh when you need deep analysis or just a quick answer.
                </p>
              </div>
            </div>

            {/* 5. Persistent sessions */}
            <div className="feature-card group flex flex-col overflow-hidden rounded-2xl border border-[#F2F2F2] bg-[#FAFAFA] transition-colors hover:border-[#E5E5E5] hover:bg-white">
              <div className="flex min-h-[200px] items-center justify-center bg-[#F5F5F5] p-5 group-hover:bg-[#FAFAFA]">
                <div className="flex w-full flex-col gap-1.5 p-2">
                  <div className="session-item flex items-center gap-2 rounded-md bg-[#171717] px-2.5 py-1.5 text-[11px] text-white shadow-sm">
                    <IconMessages className="h-3.5 w-3.5 shrink-0" stroke={1.5} />
                    <span className="truncate">API refactor discussion</span>
                  </div>
                  <div className="session-item flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] text-[#666666]">
                    <IconMessages className="h-3.5 w-3.5 shrink-0 text-[#8A8A8A]" stroke={1.5} />
                    <span className="truncate">Debug auth middleware</span>
                  </div>
                  <div className="session-item flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] text-[#666666]">
                    <IconMessages className="h-3.5 w-3.5 shrink-0 text-[#8A8A8A]" stroke={1.5} />
                    <span className="truncate">Design system review</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-sm font-semibold text-[#0F0F0F]">Persistent sessions that remember</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#666666]">
                  Every conversation is saved automatically. Rename sessions, pin the important ones, and pick up anywhere. Agent memory survives across chats.
                </p>
              </div>
            </div>

            {/* 6. One command install */}
            <div className="feature-card group flex flex-col overflow-hidden rounded-2xl border border-[#F2F2F2] bg-[#FAFAFA] transition-colors hover:border-[#E5E5E5] hover:bg-white">
              <div className="flex min-h-[200px] items-center justify-center bg-[#F5F5F5] p-5 group-hover:bg-[#FAFAFA]">
                <div className="flex flex-col items-center justify-center gap-2 p-2">
                  <div className="w-full max-w-[220px] overflow-hidden rounded-lg border border-[#E5E5E5] bg-[#171717] px-3 py-2.5 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-[#E5E5E5]" />
                      <div className="h-2 w-2 rounded-full bg-[#E5E5E5]" />
                      <div className="h-2 w-2 rounded-full bg-[#E5E5E5]" />
                    </div>
                    <div className="mt-2 font-mono text-[10px] leading-relaxed text-[#F7F7F7]">
                      <span className="text-[#8A8A8A]">$</span>{" "}
                      npm install -g hermium
                      <br />
                      <span className="text-[#8A8A8A]">$</span>{" "}
                      hermium start
                      <span className="terminal-cursor inline-block h-3 w-0.5 translate-y-0.5 bg-[#4FA3F7] align-middle" />
                      <br />
                      <span className="terminal-reveal">
                        <span className="text-[#4FA3F7]">→</span>{" "}
                        <span className="text-[#8A8A8A]">Server running at</span>{" "}
                        <span className="text-[#4FA3F7]">localhost:42424</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-sm font-semibold text-[#0F0F0F]">One command to install</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#666666]">
                  npm install -g hermium && hermium start. That's it. The API and web UI start together. Zero configuration, zero dependencies beyond Bun.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
