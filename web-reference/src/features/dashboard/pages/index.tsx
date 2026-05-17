import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { createSession } from "@/features/chat/apis"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  IconPencil,
  IconBook,
  IconCode,
  IconHeart,
  IconCloud,
  IconChevronLeft,
  IconArrowUp,
} from "@tabler/icons-react"

interface PromptMeta {
  icon: typeof IconBook
  label: string
  title: string
  description: string
  prompts: string[]
}

const PROMPT_CARDS: PromptMeta[] = [
  {
    icon: IconPencil,
    label: "Write",
    title: "Write",
    description: "Articles, stories, documentation, and all kinds of written content.",
    prompts: [
      "Write a short story about a robot learning to paint — make it emotional and reflective, around 500 words.",
      "Draft a professional email template for following up with clients after a meeting.",
      "Write a persuasive blog post on why companies should adopt a 4-day work week.",
      "Create a product description for a smart water bottle that tracks hydration, 3 sentences max per feature.",
      "Rewrite this paragraph to be more concise and impactful: [paste text]",
    ],
  },
  {
    icon: IconBook,
    label: "Learn",
    title: "Learn",
    description: "Explore new topics, get clear explanations, and dive deep into any subject.",
    prompts: [
      "Explain quantum computing like I'm 10 years old — simple but accurate with fun analogies.",
      "Teach me the basics of investing: stocks, bonds, ETFs, and how to start with $500.",
      "Give me a 5-minute summary of the French Revolution — key dates, people, and outcomes.",
      "Explain how large language models like you actually work under the hood.",
      "Walk me through the core principles of color theory for UI design.",
    ],
  },
  {
    icon: IconCode,
    label: "Code",
    title: "Code",
    description: "Build, debug, refactor, and architect software with AI assistance.",
    prompts: [
      "Build a Python script that monitors a directory for new files and uploads them to S3. Include error handling, logging, and a config file.",
      "Review this code for performance bottlenecks and suggest specific improvements: [paste code]",
      "Create a React hook that debounces a value and returns loading/error states.",
      "Write a SQL query to find the top 5 customers by revenue this month, with their last order date.",
      "Explain the difference between REST and GraphQL — when would you choose one over the other, with a real example.",
    ],
  },
  {
    icon: IconHeart,
    label: "Life stuff",
    title: "Life Stuff",
    description: "Productivity, habits, health, relationships, and everyday advice.",
    prompts: [
      "Give me a daily routine that balances deep work, exercise, social time, and rest. I work from home and tend to overwork.",
      "How do I start a regular meditation practice? Suggest a beginner-friendly 10-minute routine.",
      "I want to read more books — help me set up a sustainable reading habit and pick my first 5.",
      "What are 3 evidence-backed techniques to reduce anxiety before a big presentation?",
      "Help me plan a weekly meal prep routine that's healthy, affordable, and takes under 2 hours on Sunday.",
    ],
  },
  {
    icon: IconCloud,
    label: "Weather",
    title: "Weather",
    description: "Forecasts, climate insights, and weather patterns anywhere in the world.",
    prompts: [
      "What's the weather like today in my area? Give me a detailed forecast with temperature, humidity, and chance of rain.",
      "What's the best time of year to visit Tokyo for mild weather and fewer crowds?",
      "Explain how hurricanes form and how their intensity is categorized.",
      "Compare the climates of San Francisco and New York — which one has milder winters?",
      "What does 'dew point' actually mean and why does it matter for comfort?",
    ],
  },
]

function useGreeting() {
  const [greeting, setGreeting] = useState("")

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting("Good morning")
    else if (hour < 17) setGreeting("Good afternoon")
    else if (hour < 21) setGreeting("Good evening")
    else setGreeting("Good night")
  }, [])

  return greeting
}

function DashboardInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (text: string) => void
  disabled?: boolean
}) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [])

  useEffect(() => {
    autoResize()
  }, [value, autoResize])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSend = useCallback(() => {
    const text = value.trim()
    if (!text || disabled) return
    setValue("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    onSubmit(text)
  }, [value, disabled, onSubmit])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = value.trim().length > 0

  return (
    <div className="flex min-h-[80px] flex-col rounded-2xl border border-border bg-card shadow-sm transition-colors cursor-text hover:border-border/80">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything…"
        rows={1}
        disabled={disabled}
        className={cn(
          "w-full rounded-none border-0 p-4 text-[15px] text-foreground resize-none shadow-none outline-none bg-transparent whitespace-pre-wrap break-words placeholder:text-muted-foreground disabled:opacity-50",
          "min-h-[56px] max-h-[200px]",
        )}
      />
      <div className="flex min-h-[40px] items-center justify-end p-2 pb-1">
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            "rounded-full transition-colors cursor-pointer",
            canSend && !disabled
              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
              : "bg-primary text-primary-foreground opacity-40",
          )}
          disabled={!canSend || disabled}
          onClick={handleSend}
          title="Send message"
        >
          <IconArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const greeting = useGreeting()
  const [selectedPrompt, setSelectedPrompt] = useState<PromptMeta | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)

  const handleNewChat = useCallback(
    async (initialMessage?: string) => {
      if (submittingRef.current) return
      submittingRef.current = true
      setIsSubmitting(true)
      try {
        const session = await createSession()
        if (initialMessage) {
          // Stash the initial message so the chat page can auto-send it
          sessionStorage.setItem(`hermium_pending_msg_${session.id}`, initialMessage)
        }
        navigate({
          to: "/chat/$sessionId",
          params: { sessionId: session.id },
        })
      } catch {
        submittingRef.current = false
        setIsSubmitting(false)
      }
    },
    [navigate],
  )

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 overflow-hidden">
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-semibold tracking-tight">{greeting}</h1>
      </div>

      <div className="w-full max-w-3xl">
        <DashboardInput
          onSubmit={handleNewChat}
          disabled={isSubmitting}
        />
      </div>

      <div className="mt-6 w-full max-w-3xl">
        {selectedPrompt ? (
          <div
            key="prompt-card"
            className="rounded-2xl border bg-card p-6"
            style={{ animation: "fadeSlideIn 0.2s ease-out" }}
          >
            <button
              disabled={isSubmitting}
              onClick={() => setSelectedPrompt(null)}
              className="mb-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <IconChevronLeft className="size-3.5" />
              Back to suggestions
            </button>

            <ul className="space-y-2">
              {selectedPrompt.prompts.map((prompt, i) => (
                <li key={i}>
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleNewChat(prompt)}
                    className="group w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-left text-sm leading-relaxed text-foreground transition-colors hover:bg-muted/60 hover:border-foreground/20 disabled:opacity-50"
                  >
                    <span className="mr-2 text-xs font-medium text-muted-foreground">
                      {i + 1}.
                    </span>
                    {prompt}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div
            key="chips"
            className="flex flex-wrap justify-center gap-2"
            style={{ animation: "fadeSlideIn 0.2s ease-out" }}
          >
            {PROMPT_CARDS.map((meta) => {
              const Icon = meta.icon
              return (
                <Button
                  key={meta.label}
                  variant="ghost"
                  disabled={isSubmitting}
                  className="group flex items-center gap-2 rounded-lg border border-border bg-muted/40 dark:bg-muted/40 px-3 py-1.5 text-sm text-foreground transition-colors duration-200 ease-out hover:bg-muted/60 h-auto disabled:opacity-50"
                  onClick={() => setSelectedPrompt(meta)}
                >
                  <Icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
                  <span className="text-[15px]">{meta.label}</span>
                </Button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
