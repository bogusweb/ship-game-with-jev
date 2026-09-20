# Local fonts

- **DM Sans** — interface, descriptions, buttons, journal.
- **Space Grotesk** — headings, coordinates, numbers, section labels.

Fetched 2026-09-20 from the official Google Fonts repository:

- https://github.com/google/fonts/tree/main/ofl/dmsans
- https://github.com/google/fonts/tree/main/ofl/spacegrotesk

`DMSans-OFL.txt` and `SpaceGrotesk-OFL.txt` keep the original licenses. Do not drop them when shipping. The TTF files are unmodified, named locally `DMSans-variable.ttf` and `SpaceGrotesk-variable.ttf`.

The app loads them with `next/font/local`. There is no Google Fonts import at runtime.
