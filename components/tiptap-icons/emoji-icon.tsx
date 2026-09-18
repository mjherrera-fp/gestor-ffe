import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg"> & {
  color?: string
}

export const EmojiIcon = memo(({ color, className, ...props }: SvgProps) => (
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
    <circle cx="12" cy="12" r="10" stroke={color || "currentColor"} />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" x2="9.01" y1="9" y2="9" />
    <line x1="15" x2="15.01" y1="9" y2="9" />
  </svg>
))

EmojiIcon.displayName = "EmojiIcon"