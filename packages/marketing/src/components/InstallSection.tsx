import { useState } from "react"
import { IconCheck, IconCopy } from "@tabler/icons-react"

export function InstallSection() {
  const [copied, setCopied] = useState(false)

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section id="install" className="relative w-full py-16 md:py-24">
      <div className="mx-auto max-w-[1280px] px-6 md:px-10 lg:px-14">
        <div className="mx-auto max-w-[640px]">
          <h2
            className="text-center text-[clamp(1.75rem,3vw,2.25rem)] font-normal leading-[1.15] tracking-[-0.01em] text-[#0F0F0F]"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Install in seconds
          </h2>
          <p className="mt-4 text-center text-lg leading-relaxed text-[#666666]">
            One command. Zero configuration.
          </p>

          {/* Install command */}
          <div className="mt-8 overflow-hidden rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA]">
            <div className="flex items-center gap-1.5 border-b border-[#E5E5E5] bg-white px-4 py-2.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#E5E5E5]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#E5E5E5]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#E5E5E5]" />
              <span className="ml-2 text-xs text-[#8A8A8A]">Terminal</span>
            </div>
            <div className="flex items-start gap-3 p-4 md:p-6">
              <div className="mt-0.5 shrink-0">
                <span className="text-[#8A8A8A]">$</span>
              </div>
              <code className="flex-1 text-sm text-[#0F0F0F] md:text-base">
                npm install -g hermium && hermium start
              </code>
              <button
                onClick={() =>
                  copy("npm install -g hermium && hermium start")
                }
                className="shrink-0 rounded-lg p-1.5 text-[#8A8A8A] transition-colors hover:bg-[#EBEBEB] hover:text-[#0F0F0F]"
                aria-label="Copy command"
              >
                {copied ? (
                  <IconCheck className="h-4 w-4" />
                ) : (
                  <IconCopy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Steps */}
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Install",
                desc: "Run the command above with Bun or npm.",
              },
              {
                step: "2",
                title: "Start",
                desc: "hermium start launches both API and web UI.",
              },
              {
                step: "3",
                title: "Chat",
                desc: "Open http://localhost:42424 and start talking.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#171717] text-sm font-medium text-white">
                  {item.step}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-[#0F0F0F]">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-[#666666]">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Requirements */}
          <p className="mt-10 text-center text-sm text-[#8A8A8A]">
            Requires a running{" "}
            <a
              href="https://github.com/EKKOLearnAI/hermes-agent"
              className="underline underline-offset-2 hover:text-[#0F0F0F] transition-colors"
            >
              Hermes Agent
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  )
}
