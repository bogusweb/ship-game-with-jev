/**
 * Exact raster/ICO bytes from the Sink Jev marketing pack (`favicons/`).
 * next.config.ts materializes these into `public/favicon.ico`,
 * `public/apple-touch-icon.png`, and `public/brand/favicons/` so PNG/ICO
 * stay bit-identical to the pack.
 */
import { FAVICON_ICO } from "./pack-icon-bytes/favicon-ico";
import { APPLE_TOUCH_ICON_PNG } from "./pack-icon-bytes/apple-touch-icon-png";
import { FAVICON_16X16_PNG } from "./pack-icon-bytes/favicon-16x16-png";
import { FAVICON_32X32_PNG } from "./pack-icon-bytes/favicon-32x32-png";
import { FAVICON_48X48_PNG } from "./pack-icon-bytes/favicon-48x48-png";
import { ICON_192_PNG } from "./pack-icon-bytes/icon-192-png";
import { ICON_512_PNG } from "./pack-icon-bytes/icon-512-png";
import { ICON_MASKABLE_512_PNG } from "./pack-icon-bytes/icon-maskable-512-png";

export const PACK_ICON_FILES = {
  "favicon.ico": FAVICON_ICO,
  "apple-touch-icon.png": APPLE_TOUCH_ICON_PNG,
  "favicon-16x16.png": FAVICON_16X16_PNG,
  "favicon-32x32.png": FAVICON_32X32_PNG,
  "favicon-48x48.png": FAVICON_48X48_PNG,
  "icon-192.png": ICON_192_PNG,
  "icon-512.png": ICON_512_PNG,
  "icon-maskable-512.png": ICON_MASKABLE_512_PNG,
} as const;
