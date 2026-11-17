import Image from "next/image";
import { cn } from "@/lib/utils";

/** Brand mark (public/logo.png, cropped from public/image.png) + wordmark. */
export function Logo({ light, className }: { light?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image src="/logo.png" alt="" width={72} height={72} priority className="size-8 rounded-full object-cover ring-1 ring-black/10 sm:size-9" />
      <span className={cn("font-display text-xl font-bold tracking-tight sm:text-2xl", light ? "text-white" : "text-primary")}>FoodBridge</span>
    </span>
  );
}
