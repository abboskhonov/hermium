export function ScreenshotShowcase() {
  return (
    <section className="relative w-full pb-16 md:pb-24">
      <div className="mx-auto max-w-[1280px] px-6 md:px-10 lg:px-14">
        <div className="relative mx-auto max-w-[960px]">
          <div className="relative overflow-hidden rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
            <img
              src="/demo.png"
              alt="Hermium demo screenshot"
              className="w-full"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
