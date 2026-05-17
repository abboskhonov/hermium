export interface PlatformSettings {
  [key: string]: unknown
}

export interface HermesConfig {
  [key: string]: unknown
  telegram?: PlatformSettings
  discord?: PlatformSettings
  slack?: PlatformSettings
  whatsapp?: PlatformSettings
  matrix?: PlatformSettings
  mattermost?: PlatformSettings
}

export interface EnvVarInfo {
  is_set: boolean
  redacted_value: string | null
  description: string
  url: string | null
  category: string
  is_password: boolean
  tools: string[]
  advanced: boolean
}

export type EnvVarsResponse = Record<string, EnvVarInfo>

export interface EnvFieldDef {
  key: string
  label: string
  hint?: string
  password?: boolean
  type?: "input" | "select"
  options?: string[]
}

export interface ConfigFieldDef {
  key: string
  label: string
  hint?: string
  type: "switch" | "input"
}

export interface PlatformDef {
  key: string
  name: string
  color: string
  icon: string
  exclusive?: boolean
  primaryCred: string
  configFields: ConfigFieldDef[]
  envFields: EnvFieldDef[]
}
