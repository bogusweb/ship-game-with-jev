import type { SVGProps } from "react";

export type IconName =
  | "target"
  | "reset"
  | "help"
  | "shield"
  | "arrow"
  | "spark"
  | "jev";

/** Paths from the handoff prototype `icons` map; exported copies live in
 *  public/nocna-wachta/ikona-*.svg. Header logotype is the marketing pack. */
const paths: Record<IconName, React.ReactNode> = {
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
      <path d="M9.25 9.25a2.75 2.75 0 1 1 3.85 2.52c-.86.5-1.35 1.05-1.35 2.23" />
      <path d="M12 17.25h.01" />
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
  const box = name === "jev" ? "0 0 32 32" : "0 0 24 24";
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
