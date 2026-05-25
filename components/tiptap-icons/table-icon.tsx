import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg
      width="24"
      height="24"
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 3C2.44772 3 2 3.44772 2 4V20C2 20.5523 2.44772 21 3 21H21C21.5523 21 22 20.5523 22 20V4C22 3.44772 21.5523 3 21 3H3ZM9 5H5V9H9V5ZM9 11H5V19H9V11ZM11 11H13V19H11V11ZM20 19H15V11H20V19ZM20 9H15V5H20V9ZM13 5H11V9H13V5Z"
        fill="currentColor"
      />
    </svg>
  )
})

TableIcon.displayName = "TableIcon"
