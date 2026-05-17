import { clsx, type ClassValue } from "clsx"

// Lightweight class merge — replaces tailwind-merge (99 KB).
// Resolves the most common Tailwind conflicts: last-wins for same-prefix classes.
// Falls through to clsx for everything else.

// These prefixes are "conflict-like" — only the last occurrence matters
const CONFLICT_PREFIXES = new Set([
  "p-", "px-", "py-", "pt-", "pr-", "pb-", "pl-",
  "m-", "mx-", "my-", "mt-", "mr-", "mb-", "ml-",
  "w-", "h-", "min-w-", "min-h-", "max-w-", "max-h-",
  "gap-", "gap-x-", "gap-y-",
  "inset-", "inset-x-", "inset-y-", "top-", "right-", "bottom-", "left-",
  "z-",
  "bg-", "text-", "border-", "ring-", "shadow-",
  "rounded-", "rounded-t-", "rounded-r-", "rounded-b-", "rounded-l-",
  "rounded-tl-", "rounded-tr-", "rounded-br-", "rounded-bl-",
  "font-", "leading-", "tracking-",
  "opacity-", "scale-", "rotate-", "translate-x-", "translate-y-", "skew-x-", "skew-y-",
  "divide-x-", "divide-y-",
  "space-x-", "space-y-",
  "flex-",
  "grid-cols-", "grid-rows-",
  "col-", "col-start-", "col-end-", "row-", "row-start-", "row-end-",
  "order-",
  "duration-", "delay-", "ease-",
  "size-", "blur-", "brightness-", "contrast-", "grayscale-",
])

function getPrefix(cls: string): string | null {
  for (let i = cls.length; i > 0; i--) {
    const prefix = cls.slice(0, i)
    if (CONFLICT_PREFIXES.has(prefix)) return prefix
  }
  return null
}

export function cn(...inputs: ClassValue[]): string {
  const classes = clsx(inputs)
  if (!classes) return ""

  const seen = new Map<string, string>()
  const result: string[] = []

  for (const cls of classes.split(" ")) {
    if (!cls) continue
    const prefix = getPrefix(cls)
    if (prefix) {
      // Last-wins for same-prefix classes
      if (seen.has(prefix)) {
        // Replace previous
        const prevIdx = result.indexOf(seen.get(prefix)!)
        if (prevIdx >= 0) {
          result[prevIdx] = cls
        }
      } else {
        seen.set(prefix, cls)
        result.push(cls)
      }
    } else {
      result.push(cls)
    }
  }

  return result.join(" ")
}
