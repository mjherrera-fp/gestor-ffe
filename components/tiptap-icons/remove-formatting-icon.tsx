import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg"> & {
  color?: string
}

export const RemoveFormattingIcon = memo(({ color, className, ...props }: SvgProps) => (
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
    <path d="M4 7V4h16v3" stroke={color || "currentColor"} />
    <path d="M9 20h6" />
    <path d="M12 4v8" />
    <path d="m16 16 5 5" />
    <path d="m16 21 5-5" />
  </svg>
))

RemoveFormattingIcon.displayName = "RemoveFormattingIcon"