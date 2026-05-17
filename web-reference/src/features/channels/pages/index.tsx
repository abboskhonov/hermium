import { useState, useCallback } from "react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { IconLoader2, IconCheck, IconSparkles } from "@tabler/icons-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchConfig, fetchEnvVars, updateConfig, updateEnvVar } from "../apis"
import type { PlatformDef, HermesConfig, EnvVarsResponse } from "../types"
import { PlatformCard } from "../components/PlatformCard"
import { SettingRow } from "../components/SettingRow"

// ── Platform definitions ──────────────────────────────────────────────────

const PLATFORMS: PlatformDef[] = [
  {
    key: "telegram",
    name: "Telegram",
    exclusive: true,
    color: "#26A5E4",
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
    primaryCred: "TELEGRAM_BOT_TOKEN",
    envFields: [
      { key: "TELEGRAM_BOT_TOKEN", label: "Bot Token", hint: "Get it from @BotFather", password: true },
      { key: "TELEGRAM_ALLOWED_USERS", label: "Allowed Users", hint: "Comma-separated user IDs" },
      { key: "TELEGRAM_PROXY", label: "Proxy", hint: "Optional proxy URL" },
    ],
    configFields: [
      { key: "reactions", label: "Reactions", hint: "Add emoji reactions during processing", type: "switch" },
      { key: "allowed_chats", label: "Allowed Chats", hint: "Comma-separated chat IDs (whitelist)", type: "input" },
    ],
  },
  {
    key: "discord",
    name: "Discord",
    exclusive: true,
    color: "#5865F2",
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg>',
    primaryCred: "DISCORD_BOT_TOKEN",
    envFields: [
      { key: "DISCORD_BOT_TOKEN", label: "Bot Token", hint: "From Discord Developer Portal", password: true },
      { key: "DISCORD_ALLOWED_USERS", label: "Allowed Users", hint: "Comma-separated user IDs" },
      { key: "DISCORD_REPLY_TO_MODE", label: "Reply Mode", hint: "off / first / all", type: "select", options: ["off", "first", "all"] },
    ],
    configFields: [
      { key: "require_mention", label: "Require Mention", hint: "Only respond when @mentioned", type: "switch" },
      { key: "auto_thread", label: "Auto-thread", hint: "Create threads for long conversations", type: "switch" },
      { key: "reactions", label: "Reactions", hint: "Add emoji reactions during processing", type: "switch" },
      { key: "free_response_channels", label: "Free-response Channels", hint: "Comma-separated channel IDs", type: "input" },
      { key: "allowed_channels", label: "Allowed Channels", hint: "Comma-separated channel IDs (whitelist)", type: "input" },
    ],
  },
  {
    key: "slack",
    name: "Slack",
    exclusive: true,
    color: "#4A154B",
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 0a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V5.042zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1 2.523-2.52h6.313A2.528 2.528 0 0 1 24 18.956a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>',
    primaryCred: "SLACK_BOT_TOKEN",
    envFields: [
      { key: "SLACK_BOT_TOKEN", label: "Bot Token", hint: "xoxb-... from Slack API", password: true },
      { key: "SLACK_APP_TOKEN", label: "App Token", hint: "xapp-... for Socket Mode", password: true },
      { key: "SLACK_ALLOWED_USERS", label: "Allowed Users", hint: "Comma-separated user IDs" },
    ],
    configFields: [
      { key: "require_mention", label: "Require Mention", hint: "Only respond when @mentioned", type: "switch" },
      { key: "free_response_channels", label: "Free-response Channels", hint: "Comma-separated channel IDs", type: "input" },
      { key: "allowed_channels", label: "Allowed Channels", hint: "Comma-separated channel IDs (whitelist)", type: "input" },
    ],
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    exclusive: true,
    color: "#25D366",
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
    primaryCred: "WHATSAPP_ENABLED",
    envFields: [
      { key: "WHATSAPP_ENABLED", label: "Enabled", hint: "Set to true to enable WhatsApp", type: "select", options: ["true", "false"] },
      { key: "WHATSAPP_MODE", label: "Mode", hint: "self-chat or bot", type: "select", options: ["self-chat", "bot"] },
      { key: "WHATSAPP_ALLOWED_USERS", label: "Allowed Users", hint: "Comma-separated phone numbers" },
    ],
    configFields: [
      { key: "require_mention", label: "Require Mention", hint: "Only respond when mentioned", type: "switch" },
      { key: "free_response_chats", label: "Free-response Chats", hint: "Comma-separated chat IDs", type: "input" },
    ],
  },
  {
    key: "matrix",
    name: "Matrix",
    color: "#000000",
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M.632.55v22.9H2.28V24H0V0h2.28v.55zm7.043 7.26v1.157h.033c.309-.443.683-.784 1.117-1.024.433-.245.936-.365 1.5-.365.54 0 1.033.107 1.48.324.448.217.786.619 1.017 1.205.24-.376.558-.702.956-.98.398-.277.872-.414 1.424-.414.41 0 .784.065 1.122.194.34.13.629.325.87.588.241.263.428.59.56.984.132.393.198.85.198 1.368v5.89h-2.49v-4.893c0-.268-.016-.525-.048-.77a1.627 1.627 0 00-.2-.63 1.028 1.028 0 00-.392-.426 1.294 1.294 0 00-.616-.134c-.277 0-.508.05-.693.15a1.043 1.043 0 00-.43.41 1.768 1.768 0 00-.214.616 4.15 4.15 0 00-.06.74v4.937H9.29v-4.937c0-.25-.01-.498-.032-.742a1.84 1.84 0 00-.166-.638.998.998 0 00-.363-.448 1.206 1.206 0 00-.624-.154c-.26 0-.483.048-.67.144a1.055 1.055 0 00-.436.402 1.744 1.744 0 00-.227.616 4.108 4.108 0 00-.063.74v4.937H5.21V7.81zm15.693 15.64V.55H21.72V0H24v24h-2.28v-.55z"/></svg>',
    primaryCred: "MATRIX_ACCESS_TOKEN",
    envFields: [
      { key: "MATRIX_HOMESERVER", label: "Homeserver", hint: "e.g. https://matrix.org" },
      { key: "MATRIX_ACCESS_TOKEN", label: "Access Token", hint: "From Element settings", password: true },
      { key: "MATRIX_USER_ID", label: "User ID", hint: "e.g. @hermes:matrix.org" },
      { key: "MATRIX_ALLOWED_USERS", label: "Allowed Users", hint: "Comma-separated user IDs" },
    ],
    configFields: [
      { key: "require_mention", label: "Require Mention", hint: "Only respond when mentioned", type: "switch" },
      { key: "free_response_rooms", label: "Free-response Rooms", hint: "Comma-separated room IDs", type: "input" },
      { key: "allowed_rooms", label: "Allowed Rooms", hint: "Comma-separated room IDs (whitelist)", type: "input" },
    ],
  },
  {
    key: "feishu",
    name: "Feishu",
    exclusive: true,
    color: "#3370FF",
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.59 3.41a2.25 2.25 0 0 1 3.182 0L13.5 7.14l-3.182 3.182L6.59 7.59a2.25 2.25 0 0 1 0-3.182zm5.303 5.303L15.075 5.53a2.25 2.25 0 0 1 3.182 3.182L15.075 11.894 11.893 8.713zM3.41 6.59a2.25 2.25 0 0 1 3.182 0l3.182 3.182-3.182 3.182a2.25 2.25 0 0 1-3.182-3.182L3.41 6.59zm5.303 5.303L11.894 15.075a2.25 2.25 0 0 1-3.182 3.182L5.53 15.075 8.713 11.893zm5.303-5.303L17.478 9.778a2.25 2.25 0 0 1-3.182 3.182L10.53 10.075l3.182-3.182 0 .023z"/></svg>',
    primaryCred: "FEISHU_APP_ID",
    envFields: [
      { key: "FEISHU_APP_ID", label: "App ID", hint: "From Feishu Open Platform" },
      { key: "FEISHU_APP_SECRET", label: "App Secret", hint: "From Feishu Open Platform", password: true },
      { key: "FEISHU_ENCRYPT_KEY", label: "Encrypt Key", hint: "Optional encrypt key", password: true },
      { key: "FEISHU_VERIFICATION_TOKEN", label: "Verification Token", hint: "Optional verification token" },
    ],
    configFields: [],
  },
  {
    key: "weixin",
    name: "WeChat",
    exclusive: true,
    color: "#07C160",
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm3.68 4.025c-3.694 0-6.69 2.462-6.69 5.496 0 3.034 2.996 5.496 6.69 5.496.753 0 1.477-.1 2.158-.28a.66.66 0 01.548.074l1.46.854a.25.25 0 00.127.041.224.224 0 00.221-.225c0-.055-.022-.109-.037-.162l-.298-1.131a.453.453 0 01.163-.509C21.81 18.613 22.77 16.973 22.77 15.512c0-3.034-2.996-5.496-6.69-5.496h.198zm-2.454 3.347c.491 0 .889.404.889.902a.896.896 0 01-.889.903.896.896 0 01-.889-.903c0-.498.398-.902.889-.902zm4.912 0c.491 0 .889.404.889.902a.896.896 0 01-.889.903.896.896 0 01-.889-.903c0-.498.398-.902.889-.902z"/></svg>',
    primaryCred: "WEIXIN_TOKEN",
    envFields: [
      { key: "WEIXIN_ACCOUNT_ID", label: "Account ID", hint: "Official account ID" },
      { key: "WEIXIN_TOKEN", label: "Token", hint: "WeChat verification token", password: true },
      { key: "WEIXIN_BASE_URL", label: "Base URL", hint: "WeChat API base URL" },
      { key: "WEIXIN_CDN_BASE_URL", label: "CDN Base URL", hint: "Optional CDN base URL" },
    ],
    configFields: [],
  },
  {
    key: "wecom",
    name: "WeCom",
    color: "#1677FF",
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm3.68 4.025c-3.694 0-6.69 2.462-6.69 5.496 0 3.034 2.996 5.496 6.69 5.496.753 0 1.477-.1 2.158-.28a.66.66 0 01.548.074l1.46.854a.25.25 0 00.127.041.224.224 0 00.221-.225c0-.055-.022-.109-.037-.162l-.298-1.131a.453.453 0 01.163-.509C21.81 18.613 22.77 16.973 22.77 15.512c0-3.034-2.996-5.496-6.69-5.496h.198zm-2.454 3.347c.491 0 .889.404.889.902a.896.896 0 01-.889.903.896.896 0 01-.889-.903c0-.498.398-.902.889-.902zm4.912 0c.491 0 .889.404.889.902a.896.896 0 01-.889.903.896.896 0 01-.889-.903c0-.498.398-.902.889-.902z"/></svg>',
    primaryCred: "WECOM_BOT_ID",
    envFields: [
      { key: "WECOM_BOT_ID", label: "Bot ID", hint: "WeCom Bot identifier" },
      { key: "WECOM_SECRET", label: "Secret", hint: "WeCom application secret", password: true },
    ],
    configFields: [],
  },
]

// ── Save status indicator ──────────────────────────────────────────────────

function SaveStatus({ saving, saved }: { saving: boolean; saved: boolean }) {
  if (saving) return <IconLoader2 className="size-3 animate-spin text-muted-foreground" />
  if (saved) return <IconCheck className="size-3 text-emerald-500" />
  return null
}

// ── Main page ──────────────────────────────────────────────────────────────

export function ChannelsPage() {
  const queryClient = useQueryClient()

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
    staleTime: 30_000,
  })

  const { data: envVars, isLoading: envLoading } = useQuery({
    queryKey: ["env-vars"],
    queryFn: fetchEnvVars,
    staleTime: 30_000,
  })

  const [localEnv, setLocalEnv] = useState<Record<string, string>>({})
  const [localConfig, setLocalConfig] = useState<Record<string, Record<string, unknown>>>({})

  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set())
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set())

  const markSaving = useCallback((key: string) => {
    setSavingKeys((prev) => new Set(prev).add(key))
    setSavedKeys((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }, [])

  const markSaved = useCallback((key: string) => {
    setSavingKeys((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    setSavedKeys((prev) => new Set(prev).add(key))
    setTimeout(() => {
      setSavedKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }, 2000)
  }, [])

  const saveConfigMutation = useMutation({
    mutationFn: async (nextConfig: HermesConfig) => {
      await updateConfig(nextConfig)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] })
    },
  })

  const saveEnvMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await updateEnvVar(key, value)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["env-vars"] })
    },
  })

  const updateLocalConfig = useCallback((platform: string, key: string, value: unknown) => {
    setLocalConfig((prev) => ({
      ...prev,
      [platform]: { ...(prev[platform] || {}), [key]: value },
    }))
  }, [])

  const flushConfig = useCallback(
    (platform: string, key: string) => {
      const saveKey = `cfg.${platform}.${key}`
      const currentConfig = queryClient.getQueryData<HermesConfig>(["config"]) || {}
      const currentPlatform = (currentConfig[platform] || {}) as Record<string, unknown>
      const localValue = localConfig[platform]?.[key]
      if (localValue === undefined) return
      const nextPlatform = { ...currentPlatform, [key]: localValue }
      const nextConfig: HermesConfig = { ...currentConfig, [platform]: nextPlatform }

      markSaving(saveKey)
      saveConfigMutation.mutate(nextConfig, {
        onSuccess: () => markSaved(saveKey),
        onError: () => {
          setSavingKeys((prev) => {
            const next = new Set(prev)
            next.delete(saveKey)
            return next
          })
        },
      })
    },
    [localConfig, queryClient, saveConfigMutation, markSaving, markSaved],
  )

  const handleUpdateConfig = useCallback(
    (platform: string, key: string, value: unknown) => {
      updateLocalConfig(platform, key, value)
      flushConfig(platform, key)
    },
    [updateLocalConfig, flushConfig],
  )

  const handleSaveEnv = useCallback(
    (key: string) => {
      const value = localEnv[key]
      if (value === undefined) return
      const saveKey = `env.${key}`

      markSaving(saveKey)
      saveEnvMutation.mutate(
        { key, value },
        {
          onSuccess: () => markSaved(saveKey),
          onError: () => {
            setSavingKeys((prev) => {
              const next = new Set(prev)
              next.delete(saveKey)
              return next
            })
          },
        },
      )
    },
    [localEnv, saveEnvMutation, markSaving, markSaved],
  )

  const getConfigValue = useCallback(
    (platform: string, key: string): unknown => {
      return (localConfig as Record<string, Record<string, unknown>>)[platform]?.[key]
        ?? (config as Record<string, Record<string, unknown>> | undefined)?.[platform]?.[key]
    },
    [localConfig, config],
  )

  const isSaving = (key: string) => savingKeys.has(key)
  const isSaved = (key: string) => savedKeys.has(key)

  if (configLoading || envLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const envMap = envVars || ({} as EnvVarsResponse)

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b px-6 py-4">
        <div className="flex items-center gap-2.5">
          <IconSparkles className="size-5 text-muted-foreground" />
          <div>
            <h1 className="text-base font-semibold text-foreground">Channels</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Connect messaging platforms so Hermium can respond on Telegram, Discord, Slack, and more.
            </p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {PLATFORMS.map((p) => {
              const primaryVar = envMap[p.primaryCred]
              const hasCreds = primaryVar?.is_set ?? false
              const platformConfig = (config?.[p.key] || {}) as Record<string, unknown>
              const configured = hasCreds || Object.keys(platformConfig).length > 0

              return (
                <PlatformCard
                  key={p.key}
                  name={p.name}
                  icon={p.icon}
                  color={p.color}
                  configured={configured}
                  hasCreds={hasCreds}
                  exclusive={p.exclusive}
                >
                  {/* Env fields */}
                  {p.envFields.map((field) => {
                    const envInfo = envMap[field.key]
                    const isSet = envInfo?.is_set ?? false
                    const saveKey = `env.${field.key}`
                    const currentValue = localEnv[field.key] ?? ""

                    return (
                      <SettingRow key={field.key} label={field.label} hint={field.hint}>
                        <div className="flex items-center gap-2">
                          {field.type === "select" && field.options ? (
                            <select
                              className="w-[220px] h-8 text-xs rounded-md border border-input bg-background px-2"
                              value={currentValue || String(getConfigValue(p.key, field.key) ?? "")}
                              onChange={(e) => {
                                setLocalEnv((prev) => ({ ...prev, [field.key]: e.target.value }))
                                handleSaveEnv(field.key)
                              }}
                            >
                              <option value="">— Select —</option>
                              {field.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              className="w-[220px] h-8 text-xs font-mono"
                              type={field.password ? "password" : "text"}
                              placeholder={isSet ? "Already set (enter to overwrite)" : field.hint}
                              value={currentValue}
                              onChange={(e) => setLocalEnv((prev) => ({ ...prev, [field.key]: e.target.value }))}
                              onBlur={() => handleSaveEnv(field.key)}
                            />
                          )}
                          <SaveStatus saving={isSaving(saveKey)} saved={isSaved(saveKey)} />
                        </div>
                      </SettingRow>
                    )
                  })}

                  {/* Config fields */}
                  {p.configFields.map((field) => {
                    const saveKey = `cfg.${p.key}.${field.key}`
                    const value = getConfigValue(p.key, field.key)

                    return (
                      <SettingRow key={field.key} label={field.label} hint={field.hint}>
                        {field.type === "switch" ? (
                          <Switch
                            checked={!!value}
                            onCheckedChange={(v) => handleUpdateConfig(p.key, field.key, v)}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              className="w-[220px] h-8 text-xs"
                              value={String(value ?? "")}
                              onChange={(e) => updateLocalConfig(p.key, field.key, e.target.value)}
                              onBlur={() => flushConfig(p.key, field.key)}
                            />
                            <SaveStatus saving={isSaving(saveKey)} saved={isSaved(saveKey)} />
                          </div>
                        )}
                      </SettingRow>
                    )
                  })}
                </PlatformCard>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
