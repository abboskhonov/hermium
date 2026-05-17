import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-200 ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-[#4FA3F7] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#171717] text-[#F7F7F7] hover:bg-[#171717]/90 rounded-full",
        secondary: "bg-[#F2F2F2] text-[#0F0F0F] hover:bg-[#E5E5E5] rounded-full",
        outline: "border-[#DBDBDB] bg-transparent text-[#0F0F0F] hover:bg-[#FAFAFA] rounded-lg",
        ghost: "bg-transparent text-[#0F0F0F] hover:bg-[#EBEBEB] rounded-[10px]",
        link: "text-[#0F0F0F] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9.5 gap-1.5 px-4 py-2",
        sm: "h-8 gap-1.5 px-3 py-1.5 text-sm",
        lg: "h-11 gap-1.5 px-6 py-3 text-base",
        icon: "size-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
