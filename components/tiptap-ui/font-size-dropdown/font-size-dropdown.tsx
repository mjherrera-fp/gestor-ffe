import { forwardRef, useCallback, useState } from "react"

// --- Icons ---
import { ChevronDownIcon } from "@/components/tiptap-icons/chevron-down-icon"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Tiptap UI ---
import type { UseFontSizeConfig } from "@/components/tiptap-ui/font-size-dropdown"
import {
  FONT_SIZE_OPTIONS,
  useFontSize,
} from "@/components/tiptap-ui/font-size-dropdown"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
} from "@/components/tiptap-ui-primitive/dropdown-menu"

export interface FontSizeDropdownProps
  extends Omit<ButtonProps, "type">, UseFontSizeConfig {
  /**
   * Callback for when the dropdown opens or closes
   */
  onOpenChange?: (isOpen: boolean) => void
  /**
   * Whether the dropdown should use a modal
   */
  modal?: boolean
}

/**
 * Dropdown menu component for selecting font sizes in a Tiptap editor.
 */
export const FontSizeDropdown = forwardRef<
  HTMLButtonElement,
  FontSizeDropdownProps
>(
  (
    {
      editor: providedEditor,
      hideWhenUnavailable = false,
      onOpenChange,
      children,
      modal = true,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor)
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const { isVisible, canSet, activeFontSize, setFontSize, label, Icon } =
      useFontSize({ editor, hideWhenUnavailable })

    const activeItem =
      FONT_SIZE_OPTIONS.find(
        (option) => option.value && option.value === activeFontSize
      ) ?? FONT_SIZE_OPTIONS[0]

    const handleOpenChange = useCallback(
      (open: boolean) => {
        if (!editor || !canSet) return
        setIsOpen(open)
        onOpenChange?.(open)
      },
      [canSet, editor, onOpenChange]
    )

    const handleSelect = useCallback(
      (option: (typeof FONT_SIZE_OPTIONS)[number]) => {
        setFontSize(option.value)
        setIsOpen(false)
      },
      [setFontSize]
    )

    if (!isVisible) {
      return null
    }

    return (
      <DropdownMenu modal={modal} open={isOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            role="button"
            tabIndex={-1}
            disabled={!canSet}
            data-disabled={!canSet}
            aria-label={label}
            tooltip={label}
            {...buttonProps}
            ref={ref}
          >
            {children ? (
              children
            ) : (
              <>
                <Icon className="tiptap-button-icon" />
                {activeItem.value && (
                  <span className="tiptap-button-text">
                    {activeItem.value.replace("px", "")}
                  </span>
                )}
                <ChevronDownIcon className="tiptap-button-dropdown-small" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            {FONT_SIZE_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={`font-size-${option.value || "auto"}`}
                onSelect={() => handleSelect(option)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
)

FontSizeDropdown.displayName = "FontSizeDropdown"

export default FontSizeDropdown