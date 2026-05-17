import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { useTheme } from "@/lib/theme-provider"
import { IconSun, IconMoon, IconDeviceDesktop, IconCheck } from "@tabler/icons-react"

const themes = [
  { value: "light" as const, label: "Light", icon: IconSun },
  { value: "dark" as const, label: "Dark", icon: IconMoon },
  { value: "system" as const, label: "System", icon: IconDeviceDesktop },
]

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            className="text-muted-foreground hover:text-foreground"
          >
            <IconSun className="size-4 dark:hidden" />
            <IconMoon className="size-4 hidden dark:block" />
            <span className="text-sm font-medium">Theme</span>
          </SidebarMenuButton>
        }
      />
      <DropdownMenuContent align="start" side="right" sideOffset={8}>
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.value}
            className="gap-2 cursor-pointer"
            onClick={() => setTheme(t.value)}
          >
            <t.icon className="size-4" />
            <span className="flex-1">{t.label}</span>
            {theme === t.value && <IconCheck className="size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
