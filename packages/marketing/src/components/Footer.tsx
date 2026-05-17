import { IconBrandGithub, IconBrandTwitter, IconBrandDiscord, IconMail } from "@tabler/icons-react"

export function Footer() {
  const columns = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "Install", href: "#install" },
        { label: "Changelog", href: "https://github.com/abboskhonov/hermium/releases" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "#docs" },
        { label: "GitHub", href: "https://github.com/abboskhonov/hermium" },
        { label: "Issues", href: "https://github.com/abboskhonov/hermium/issues" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "License", href: "https://github.com/abboskhonov/hermium/blob/main/LICENSE" },
        { label: "Privacy", href: "#" },
      ],
    },
  ]

  const socials = [
    { icon: IconBrandGithub, href: "https://github.com/abboskhonov/hermium", label: "GitHub" },
    { icon: IconBrandTwitter, href: "https://twitter.com", label: "Twitter" },
    { icon: IconBrandDiscord, href: "#", label: "Discord" },
    { icon: IconMail, href: "mailto:hello@hermium.dev", label: "Email" },
  ]

  return (
    <footer className="w-full border-t border-[#F2F2F2] bg-white">
      <div className="mx-auto max-w-[1280px] px-6 py-12 md:px-10 md:py-16 lg:px-14">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand column */}
          <div className="md:col-span-1">
            <a href="/" className="flex items-center gap-2.5 text-[#0F0F0F]">
              <img
                src="/nous-logo.png"
                alt="Hermium"
                className="h-6 w-6 shrink-0 rounded-[5px] border border-white object-cover shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
              />
              <span className="text-base font-semibold tracking-tight">
                Hermium
              </span>
            </a>
            <p className="mt-3 max-w-[200px] text-sm leading-relaxed text-[#666666]">
              Self-hosted AI chat for your Hermes Agent.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-[#0F0F0F]">
                {col.title}
              </h4>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-[#666666] transition-colors hover:text-[#0F0F0F]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#F2F2F2] pt-6 md:flex-row">
          <p className="text-sm text-[#8A8A8A]">
            © {new Date().getFullYear()} Hermium. Open source.
          </p>

          <div className="flex items-center gap-3">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#8A8A8A] transition-colors hover:bg-[#F5F5F5] hover:text-[#0F0F0F]"
                aria-label={s.label}
              >
                <s.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
