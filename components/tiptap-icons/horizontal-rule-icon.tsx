import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg"> & {
  color?: string
}

export const HorizontalRuleIcon = memo(({ color, className, ...props }: SvgProps) => (
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
    <line x1="4" x2="20" y1="12" y2="12" stroke={color || "currentColor"} />
    <line x1="4" x2="9" y1="8" y2="8" />
    <line x1="4" x2="9" y1="16" y2="16" />
  </svg>
))

HorizontalRuleIcon.displayName = "HorizontalRuleIcon"