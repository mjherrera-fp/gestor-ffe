import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg"> & {
  color?: string
}

export const TextSizeIcon = memo(({ color, className, ...props }: SvgProps) => (
  <svg
    width="24"
    height="24"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M5 7V4h14v3" stroke={color || "currentColor"} />
    <path d="M8 20V7h8v13" />
    <path d="M8 14h8" />
  </svg>
))

TextSizeIcon.displayName = "TextSizeIcon"