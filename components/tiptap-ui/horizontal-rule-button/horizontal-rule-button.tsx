import { forwardRef, useCallback } from "react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Icons ---
import { HorizontalRuleIcon } from "@/components/tiptap-icons/horizontal-rule-icon"

// --- Lib ---
import { isExtensionAvailable } from "@/lib/tiptap-utils"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"

export interface HorizontalRuleButtonProps
  extends Omit<ButtonProps, "type"> {
  editor?: Parameters<typeof useTiptapEditor>[0]
  /**
   * Optional text to display alongside the icon.
   */
  text?: string
}

/**
 * Button component for inserting a horizontal rule in a Tiptap editor.
 */
export const HorizontalRuleButton = forwardRef<
  HTMLButtonElement,
  HorizontalRuleButtonProps
>(({ editor: providedEditor, text, onClick, children, ...buttonProps }, ref) => {
  const { editor } = useTiptapEditor(providedEditor)
  const canInsert = !!editor && isExtensionAvailable(editor, "horizontalRule")

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (event.defaultPrevented) return
      editor?.chain().focus().setHorizontalRule().run()
    },
    [editor, onClick]
  )

  return (
    <Button
      type="button"
      variant="ghost"
      role="button"
      tabIndex={-1}
      disabled={!canInsert}
      data-disabled={!canInsert}
      aria-label="Insert horizontal rule"
      tooltip="Horizontal rule"
      onClick={handleClick}
      {...buttonProps}
      ref={ref}
    >
      {children ?? (
        <>
          <HorizontalRuleIcon className="tiptap-button-icon" />
          {text && <span className="tiptap-button-text">{text}</span>}
        </>
      )}
    </Button>
  )
})

HorizontalRuleButton.displayName = "HorizontalRuleButton"

export default HorizontalRuleButton