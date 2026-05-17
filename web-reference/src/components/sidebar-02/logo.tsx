import type { SVGProps } from "react";

export const Logo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    fill="none"
    viewBox="0 0 64 64"
    width="40"
    height="40"
    {...props}
  >
    {/* Staff */}
    <rect x="30" y="10" width="4" height="46" rx="2" fill="currentColor" />
    {/* Wings (left) */}
    <path
      d="M30 18 C24 14, 14 14, 10 18 C14 16, 22 16, 28 20"
      fill="currentColor"
      opacity="0.85"
    />
    <path
      d="M30 22 C26 19, 18 19, 14 22 C18 20, 24 20, 28 24"
      fill="currentColor"
      opacity="0.6"
    />
    {/* Wings (right) */}
    <path
      d="M34 18 C40 14, 50 14, 54 18 C50 16, 42 16, 36 20"
      fill="currentColor"
      opacity="0.85"
    />
    <path
      d="M34 22 C38 19, 46 19, 50 22 C46 20, 40 20, 36 24"
      fill="currentColor"
      opacity="0.6"
    />
    {/* Left serpent */}
    <path
      d="M32 48 C22 44, 20 38, 26 34 C20 36, 18 42, 24 46 C18 40, 22 30, 30 28 C24 32, 22 38, 28 42"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.9"
    />
    {/* Right serpent */}
    <path
      d="M32 48 C42 44, 44 38, 38 34 C44 36, 46 42, 40 46 C46 40, 42 30, 34 28 C40 32, 42 38, 36 42"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.7"
    />
    {/* Orb at top */}
    <circle cx="32" cy="10" r="4" fill="currentColor" />
    <circle cx="32" cy="10" r="2" fill="currentColor" opacity="0.5" />
  </svg>
);
