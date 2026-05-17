import { createFileRoute } from "@tanstack/react-router"
import { Navbar } from "@/components/Navbar"
import { Hero } from "@/components/Hero"
import { ScreenshotShowcase } from "@/components/ScreenshotShowcase"
import { Features } from "@/components/Features"
import { InstallSection } from "@/components/InstallSection"
import { Footer } from "@/components/Footer"

export const Route = createFileRoute("/")({ component: LandingPage })

function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ScreenshotShowcase />
        <Features />
        <InstallSection />
      </main>
      <Footer />
    </div>
  )
}
