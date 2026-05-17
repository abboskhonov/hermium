import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { IconMenu2, IconX } from "@tabler/icons-react"

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Docs", href: "#docs" },
    { label: "GitHub", href: "https://github.com/abboskhonov/hermium" },
  ]

  return (
    <>
      <header
        className={
          "fixed top-0 z-50 w-full transition-all duration-200 ease-out " +
          (scrolled
            ? "border-b border-[#F2F2F2] bg-white/90 backdrop-blur-xl"
            : "bg-white/80 backdrop-blur-xl")
        }
      >
        <div className="mx-auto flex h-12 items-center px-6 md:h-14 md:px-10 lg:px-14 lg:max-w-[1280px]">
          {/* Logo */}
          <a
            href="/"
            className="flex items-center gap-2.5 pr-6 pt-1 text-[#0F0F0F]"
            aria-label="Hermium home"
          >
            <img
              src="/nous-logo.png"
              alt="Hermes"
              className="h-7 w-7 shrink-0 rounded-[6px] border border-white object-cover shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
            />
            <span className="text-lg font-semibold tracking-tight">
              Hermium
            </span>
          </a>

          {/* Desktop Nav — centered */}
          <nav className="hidden md:flex items-center space-x-1 lg:absolute lg:left-1/2 lg:-translate-x-1/2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium text-[#0F0F0F] transition-colors hover:bg-[#EBEBEB]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2.5 ml-auto">
            <Button variant="ghost" size="sm" asChild>
              <a href="#install">Install</a>
            </Button>
            <Button variant="default" size="sm" asChild>
              <a href="https://github.com/abboskhonov/hermium">GitHub</a>
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="ml-auto md:hidden inline-flex items-center justify-center rounded-lg h-8 w-8 text-[#0F0F0F] hover:bg-[#EBEBEB] transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <IconX className="h-5 w-5" />
            ) : (
              <IconMenu2 className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[280px] bg-white p-6 pt-20 shadow-lg">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="rounded-full px-3 py-2.5 text-sm font-medium text-[#0F0F0F] hover:bg-[#F5F5F5] transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-6 flex flex-col gap-2">
              <Button variant="ghost" className="w-full justify-start" asChild>
                <a href="#install">Install</a>
              </Button>
              <Button variant="default" className="w-full" asChild>
                <a href="https://github.com/abboskhonov/hermium">GitHub</a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
