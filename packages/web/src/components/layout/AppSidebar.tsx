import { Link } from "@tanstack/react-router"
import { useAppStore } from "@/stores/app"
import { Button } from "@/components/ui/button"

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/chat", label: "Chat" },
  { to: "/sessions", label: "Sessions" },
  { to: "/files", label: "Files" },
  { to: "/settings", label: "Settings" },
]

export default function AppSidebar() {
  const { sidebarOpen, closeSidebar } = useAppStore()

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={closeSidebar}
        />
      )}
      <aside
        className={`
          fixed z-50 flex h-svh w-60 flex-col border-r bg-background
          transition-transform duration-200 ease-in-out
          md:static md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <img src="/logo.png" alt="Hermium" className="size-6" />
          <span className="font-semibold">Hermium</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground"
              activeProps={{ "aria-current": "page" }}
              onClick={closeSidebar}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start">
            Profile: {useAppStore((s) => s.activeProfile)}
          </Button>
        </div>
      </aside>
    </>
  )
}
