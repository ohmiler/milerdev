import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// The type scale in globals.css (text-display … text-caption) is a font-size scale. Without this,
// tailwind-merge reads `text-caption` as a text colour and drops it next to `text-muted-foreground`.
export const TYPE_SCALE_STEPS = ["display", "h1", "h2", "h3", "lead", "caption"] as const

const twMerge = extendTailwindMerge({
  extend: {
    theme: { text: [...TYPE_SCALE_STEPS] },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
