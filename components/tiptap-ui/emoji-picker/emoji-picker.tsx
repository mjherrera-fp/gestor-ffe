import { forwardRef, useCallback, useMemo, useRef, useState } from "react"
import { type Editor } from "@tiptap/react"

// --- Hooks ---
import { useMenuNavigation } from "@/hooks/use-menu-navigation"
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Icons ---
import { EmojiIcon } from "@/components/tiptap-icons/emoji-icon"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/tiptap-ui-primitive/popover"
import { Card, CardBody } from "@/components/tiptap-ui-primitive/card"

// --- Styles ---
import "@/components/tiptap-ui/emoji-picker/emoji-picker.scss"

export interface EmojiPickerProps
  extends Omit<ButtonProps, "type"> {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null
  /**
   * Optional custom list of emojis.
   */
  emojis?: string[]
  /**
   * Callback fired after an emoji is inserted.
   */
  onInserted?: () => void
}

export const DEFAULT_EMOJIS: string[] = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😊",
  "😍",
  "😘",
  "😎",
  "🤔",
  "😅",
  "🙂",
  "😉",
  "🥳",
  "😴",
  "👍",
  "👎",
  "👏",
  "🙏",
  "💪",
  "🤝",
  "🎉",
  "✨",
  "⭐",
  "🔥",
  "✅",
  "❌",
  "⚠️",
  "❗",
  "📌",
  "📅",
  "📞",
  "📧",
  "🔗",
  "💡",
  "🚀",
  "❤️",
]

export const EmojiPickerButton = forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, children, ...props }, ref) => (
  <Button
    type="button"
    className={className}
    variant="ghost"
    data-appearance="default"
    role="button"
    tabIndex={-1}
    aria-label="Insert emoji"
    tooltip="Emoji"
    ref={ref}
    {...props}
  >
    {children ?? <EmojiIcon className="tiptap-button-icon" />}
  </Button>
))

EmojiPickerButton.displayName = "EmojiPickerButton"

export function EmojiPickerContent({
  editor,
  emojis = DEFAULT_EMOJIS,
  onInserted,
}: {
  editor?: Editor | null
  emojis?: string[]
  onInserted?: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  const insertEmoji = useCallback(
    (emoji: string) => {
      if (!editor) return
      editor.chain().focus().insertContent(emoji).run()
      onInserted?.()
    },
    [editor, onInserted]
  )

  const emojiItems = useMemo(
    () => emojis.map((emoji) => ({ value: emoji, label: emoji })),
    [emojis]
  )

  const { selectedIndex } = useMenuNavigation({
    containerRef,
    items: emojiItems,
    orientation: "both",
    onSelect: (item) => {
      insertEmoji(item.value)
      return true
    },
    autoSelectFirstItem: false,
  })

  return (
    <Card
      ref={containerRef}
      tabIndex={0}
      style={{ overflow: "auto", maxHeight: 280 }}
    >
      <CardBody
        className="tiptap-emoji-grid"
        style={{ padding: 8 }}
      >
        {emojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            role="menuitem"
            data-emoji-item
            data-highlighted={selectedIndex === index}
            tabIndex={selectedIndex === index ? 0 : -1}
            aria-label={`Insert emoji ${emoji}`}
            className="tiptap-emoji-item"
            onMouseDown={(event) => {
              event.preventDefault()
              insertEmoji(emoji)
            }}
          >
            {emoji}
          </button>
        ))}
      </CardBody>
    </Card>
  )
}

export function EmojiPicker({
  editor: providedEditor,
  emojis = DEFAULT_EMOJIS,
  onInserted,
  ...props
}: EmojiPickerProps) {
  const { editor } = useTiptapEditor(providedEditor)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <EmojiPickerButton {...props} />
      </PopoverTrigger>
      <PopoverContent align="start">
        <EmojiPickerContent
          editor={editor}
          emojis={emojis}
          onInserted={() => {
            onInserted?.()
            setIsOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export default EmojiPicker