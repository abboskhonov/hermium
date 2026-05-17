import {
  IconPaint,
  IconBrandGithub,
  IconWorld,
  IconBrandTelegram,
  IconArrowUpRight,
  IconPackage,
  IconBrain,
} from "@tabler/icons-react"
import { useTheme } from "@/lib/theme-provider"
import { useVersionCheck } from "@/features/version/queries"
import { updateModelConfig } from "@/features/chat/apis"
import { useModels } from "@/features/chat/queries"
import { useState, useCallback } from "react"

export type SettingsSection = keyof typeof settingsMap

const settingsMap = {
  appearance: {
    icon: IconPaint,
    title: "Appearance",
    description: "Choose your preferred theme",
    get content() {
      return <AppearanceSettings />
    },
  },
  model: {
    icon: IconBrain,
    title: "Model",
    description: "Choose your default AI model",
    get content() {
      return <ModelSettings />
    },
  },
  about: {
    icon: IconBrandGithub,
    title: "About",
    description: "Links and community",
    get content() {
      return <AboutSettings />
    },
  },
}

function AboutSettings() {
  const { data } = useVersionCheck()

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3.5 rounded-xl border border-border bg-background px-4 py-3 shadow-sm">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/40">
          <IconPackage className="size-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium">Hermium</div>
          <div className="text-xs text-muted-foreground">
            {data?.current ? `Version ${data.current}` : "Loading version..."}
            {data?.outdated && data.latest && (
              <span className="ml-1.5 text-amber-600 dark:text-amber-400">
                (v{data.latest} available)
              </span>
            )}
          </div>
        </div>
      </div>
      <a
          href="https://github.com/abboskhonov/hermium"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3.5 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm hover:border-foreground/20 hover:shadow-md transition-all"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
            <IconBrandGithub className="size-5 text-neutral-700 dark:text-neutral-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium">GitHub</div>
            <div className="text-xs text-muted-foreground truncate">abboskhonov/hermium</div>
          </div>
          <IconArrowUpRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </a>
        <a
          href="https://hermium.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3.5 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm hover:border-foreground/20 hover:shadow-md transition-all"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
            <IconWorld className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium">Website</div>
            <div className="text-xs text-muted-foreground truncate">hermium.vercel.app</div>
          </div>
          <IconArrowUpRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </a>
        <a
          href="https://t.me/hermium_chat"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3.5 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm hover:border-foreground/20 hover:shadow-md transition-all"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950/40">
            <IconBrandTelegram className="size-5 text-sky-500 dark:text-sky-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium">Telegram</div>
            <div className="text-xs text-muted-foreground truncate">@hermium_chat</div>
          </div>
          <IconArrowUpRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </a>
      </div>
    )
  }

export function ModelSettings() {
  const { data, isLoading } = useModels()
  const [selected, setSelected] = useState("")
  const [saving, setSaving] = useState(false)

  const models = data?.models ?? []
  const defaultModel = data?.default_model

  const current = selected || defaultModel || ""

  const handleSave = useCallback(async () => {
    if (!current) return
    setSaving(true)
    try {
      await updateModelConfig({ model: current })
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }, [current])

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Active Model</label>
      <p className="text-sm text-muted-foreground">
        Pick the model your Hermes agent currently uses.
      </p>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : models.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No models found. Check your <code>~/.hermes/config.yaml</code>.
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <select
            value={current}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-[240px]"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={saving || !current || current === defaultModel}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              saving || !current || current === defaultModel
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
      {defaultModel && (
        <p className="text-xs text-muted-foreground">
          Current: <span className="font-medium text-foreground">{defaultModel}</span>
        </p>
      )}
    </div>
  )
}

function ThemePreview({ variant }: { variant: "light" | "dark" | "system" }) {
  const isLight = variant === "light"
  const isDark = variant === "dark"

  return (
    <div className="relative w-full aspect-[16/10] overflow-hidden rounded-lg">
      {variant === "system" ? (
        <div className="flex h-full w-full">
          <div className="flex h-full w-1/2 bg-neutral-100">
            <MiniSidebar light />
            <MiniContent light />
          </div>
          <div className="flex h-full w-1/2 bg-neutral-900">
            <MiniSidebar light={false} />
            <MiniContent light={false} />
          </div>
        </div>
      ) : (
        <div className={cn("flex h-full w-full", isLight ? "bg-neutral-100" : "bg-neutral-900")}>
          <MiniSidebar light={isLight} />
          <MiniContent light={isLight} />
        </div>
      )}
    </div>
  )
}

function MiniSidebar({ light }: { light: boolean }) {
  const bg = light ? "bg-white" : "bg-neutral-800"
  const line = light ? "bg-neutral-200" : "bg-neutral-700"
  const accent = light ? "bg-neutral-300" : "bg-neutral-600"
  return (
    <div className={cn("flex w-[28%] flex-col gap-1.5 p-1.5", bg)}>
      <div className={cn("h-1.5 w-4 rounded-sm", accent)} />
      <div className={cn("mt-1 h-0.5 w-full rounded-sm", line)} />
      <div className={cn("h-0.5 w-3/4 rounded-sm", line)} />
      <div className={cn("h-0.5 w-5/6 rounded-sm", line)} />
      <div className={cn("mt-auto h-0.5 w-2/3 rounded-sm", line)} />
    </div>
  )
}

function MiniContent({ light }: { light: boolean }) {
  const bg = light ? "bg-neutral-50" : "bg-neutral-950"
  const msgUser = light ? "bg-neutral-200" : "bg-neutral-700"
  const msgBot = light ? "bg-neutral-100" : "bg-neutral-800"
  return (
    <div className={cn("flex flex-1 flex-col gap-1.5 p-1.5", bg)}>
      <div className={cn("h-2 w-full rounded-sm", msgBot)} />
      <div className={cn("ml-auto h-2 w-2/3 rounded-sm", msgUser)} />
      <div className={cn("h-2 w-5/6 rounded-sm", msgBot)} />
      <div className={cn("ml-auto h-2 w-1/2 rounded-sm", msgUser)} />
      <div className={cn("mt-auto h-1.5 w-full rounded-sm", light ? "bg-white" : "bg-neutral-800")} />
    </div>
  )
}

function AppearanceSettings() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">Theme</label>
      <p className="text-sm text-muted-foreground">Choose how Hermium looks for you.</p>
      <div className="grid grid-cols-3 gap-3 pt-1">
        {[
          { id: "light" as const, label: "Light" },
          { id: "dark" as const, label: "Dark" },
          { id: "system" as const, label: "System" },
        ].map((t) => {
          const isActive = t.id === theme
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-2 text-xs font-medium transition-all",
                isActive
                  ? "border-[#2563eb] bg-primary/5 text-foreground ring-1 ring-[#2563eb]"
                  : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground",
              )}
            >
              <ThemePreview variant={t.id} />
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

export function SettingsPage({ section }: { section?: string }) {
  const currentSectionId: SettingsSection = (
    section && section in settingsMap ? section : "appearance"
  ) as SettingsSection
  const current = settingsMap[currentSectionId]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-8 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">{current.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{current.description}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          {current.content}
        </div>
      </div>
    </div>
  )
}
