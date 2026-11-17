import { OG_SIZE, renderShareImage } from "@/lib/og-image";

export const alt = "FoodBridge: surplus food finds a plate";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderShareImage();
}
