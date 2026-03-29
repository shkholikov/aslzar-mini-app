import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-md bg-gradient-to-r from-white/10 via-white/40 to-white/10 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]", className)}
      {...props}
    />
  )
}

export { Skeleton }
