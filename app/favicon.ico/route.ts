import { PACK_ICON_FILES } from "@/lib/brand/pack-icons";

/** Browser tab ICO from the marketing pack (`favicons/favicon.ico`). */
export function GET() {
  const body = Buffer.from(PACK_ICON_FILES["favicon.ico"], "base64");
  return new Response(body, {
    headers: {
      "Content-Type": "image/x-icon",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
