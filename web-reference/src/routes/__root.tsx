import React, { Suspense } from "react"
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/query-client"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/lib/theme-provider"
import { DashboardLayout } from "@/components/sidebar-02"

import appCss from "../styles.css?url"

const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('hermium-theme') || 'system';
      var resolved = theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  })();
`

function DevTools() {
  const [TD, TRDP] = [
    React.lazy(() => import("@tanstack/react-devtools").then(m => ({ default: m.TanStackDevtools }))),
    React.lazy(() => import("@tanstack/react-router-devtools").then(m => ({ default: m.TanStackRouterDevtoolsPanel }))),
  ]
  return (
    <Suspense fallback={null}>
      <TD
        config={{ position: "bottom-right" }}
        plugins={[{ name: "Tanstack Router", render: <TRDP /> }]}
      />
    </Suspense>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "Hermium" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
    scripts: [{ type: "text/javascript", children: themeScript }],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <TooltipProvider>
              <DashboardLayout>{children}</DashboardLayout>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
        {import.meta.env.DEV && (
          <Suspense fallback={null}>
            <DevTools />
          </Suspense>
        )}
        <Scripts />
      </body>
    </html>
  )
}
