import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/sidebar-02/app-sidebar";
import { cn } from "@/lib/utils";

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <div className="relative flex h-dvh w-full">
      <DashboardSidebar />
      <SidebarInset className="flex flex-col min-w-0">
        {/* Collapsed: show sidebar open button in the main content header area */}
        {isCollapsed && (
          <div className="shrink-0 flex items-center border-b px-4 py-3">
            <SidebarTrigger
              className={cn(
                "mr-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              )}
            />
            <span className="font-semibold text-sm text-foreground tracking-tight">
              Hermium
            </span>
          </div>
        )}
        {children}
      </SidebarInset>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutInner>{children}</LayoutInner>
    </SidebarProvider>
  );
}
