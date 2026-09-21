import { PACK_ICON_FILES } from "@/lib/brand/pack-icons";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon from the marketing pack, not generated artwork. */
export default function AppleIcon() {
  const body = Buffer.from(PACK_ICON_FILES["apple-touch-icon.png"], "base64");
  return new Response(body, {
    headers: { "Content-Type": "image/png" },
  });
}
