import type { ReactNode } from "react"

interface SettingRowProps {
  label: string
  hint?: string
  children: ReactNode
}

export function SettingRow({ label, hint, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-muted/40 transition-colors">
      <div className="flex-1 mr-3 min-w-0">
        <span className="text-[12px] font-medium text-foreground/80 block">{label}</span>
        {hint && (
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{hint}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
