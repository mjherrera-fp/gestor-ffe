import { forwardRef, useCallback } from "react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Icons ---
import { RemoveFormattingIcon } from "@/components/tiptap-icons/remove-formatting-icon"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"

export interface ClearFormattingButtonProps
  extends Omit<ButtonProps, "type"> {
  editor?: Parameters<typeof useTiptapEditor>[0]
  /**
   * Optional text to display alongside the icon.
   */
  text?: string
}

/**
 * Button component for clearing all formatting (marks and block styles)
 * in a Tiptap editor.
 */
export const ClearFormattingButton = forwardRef<
  HTMLButtonElement,
  ClearFormattingButtonProps
>(({ editor: providedEditor, text, onClick, children, ...buttonProps }, ref) => {
  const { editor } = useTiptapEditor(providedEditor)

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (event.defaultPrevented) return
      editor?.chain().focus().unsetAllMarks().clearNodes().run()
    },
    [editor, onClick]
  )

  return (
    <Button
      type="button"
      variant="ghost"
      role="button"
      tabIndex={-1}
      aria-label="Clear formatting"
      tooltip="Clear formatting"
      onClick={handleClick}
      {...buttonProps}
      ref={ref}
    >
      {children ?? (
        <>
          <RemoveFormattingIcon className="tiptap-button-icon" />
          {text && <span className="tiptap-button-text">{text}</span>}
        </>
      )}
    </Button>
  )
})

ClearFormattingButton.displayName = "ClearFormattingButton"

export default ClearFormattingButton