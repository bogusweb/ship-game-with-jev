import type { SVGProps } from "react";

export type IconName =
  | "logo"
  | "target"
  | "reset"
  | "help"
  | "shield"
  | "arrow"
  | "spark"
  | "jev";

/** Paths from the handoff prototype `icons` map; exported copies live in
 *  public/nocna-wachta/ikona-*.svg. */
const paths: Record<IconName, React.ReactNode> = {
  logo: (
    <>
      <path d="M4 16 9 22h15l5-6H4Z" fill="currentColor" />
      <path
        d="M10 14V9h10l4 5M16 9V4m0 0 7 3h-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M4 26q3-3 6 0t6 0 6 0 6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 1v5m0 12v5M1 12h5m12 0h5" />
    </>
  ),
  reset: <path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 4.5 1.5c-1 1-2 1-2 3M12 17h.01" />
    </>
  ),
  shield: (
    <>
      <path d="m12 3 8 3v6c0 4-8 9-8 9s-8-5-8-9V6l8-3Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  spark: (
    <path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z" />
  ),
  jev: (
    <>
      <path
        d="M9 5h14v5H9zM5 10h22v14H5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M10 15v3m12-3v3m-11 4h10M16 5V2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect x="13" y="10" width="6" height="4" fill="currentColor" />
    </>
  ),
};

export function Icon({
  name,
  ...rest
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  const box = name === "logo" || name === "jev" ? "0 0 32 32" : "0 0 24 24";
  return (
    <svg
      viewBox={box}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
