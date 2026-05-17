import { Button } from "@/components/ui/button"
import { IconBrandGithub, IconArrowRight } from "@tabler/icons-react"

export function Hero() {
  return (
    <section className="relative w-full overflow-hidden pt-14 md:pt-[88px]">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center px-6 py-16 text-center md:px-10 md:py-24 lg:px-14 lg:py-32">
        {/* Headline */}
        <h1
          className="max-w-[860px] text-[clamp(3rem,7vw,5.5rem)] font-normal leading-[1.02] tracking-[-0.02em] text-[#0F0F0F]"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          Self-hosted AI chat
          <br />
          for your Hermes agent
        </h1>

        {/* Subtitle */}
        <p className="mt-7 max-w-[560px] text-lg leading-relaxed text-[#666666]">
          Hermium gives you a clean, fast chat interface that connects to your
          Hermes Agent. One command to install. Zero config to run.
        </p>

        {/* CTAs */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Button variant="default" size="lg" asChild>
            <a
              href="#install"
              className="inline-flex items-center gap-2 whitespace-nowrap"
            >
              Get Hermium
              <IconArrowRight className="h-4 w-4 shrink-0" />
            </a>
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <a
              href="https://github.com/abboskhonov/hermium"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 whitespace-nowrap"
            >
              <IconBrandGithub className="h-4 w-4 shrink-0" />
              View on GitHub
            </a>
          </Button>
        </div>

        {/* Trust */}
        <p className="mt-10 text-sm text-[#8A8A8A]">
          Free & open source.
        </p>
      </div>
    </section>
  )
}
