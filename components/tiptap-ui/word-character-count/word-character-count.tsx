import { useMemo } from "react"
import { type Editor, useEditorState } from "@tiptap/react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

export interface WordCharacterCountProps {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null
  /**
   * Whether to show the word count.
   * @default true
   */
  showWords?: boolean
  /**
   * Whether to show the character count.
   * @default true
   */
  showCharacters?: boolean
}

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

/**
 * Component that displays the current word and character count
 * of a Tiptap editor.
 */
export function WordCharacterCount({
  editor: providedEditor,
  showWords = true,
  showCharacters = true,
}: WordCharacterCountProps) {
  const { editor } = useTiptapEditor(providedEditor)

  const text = useEditorState({
    editor,
    selector(context) {
      if (!context.editor) return ""
      return context.editor.getText() ?? ""
    },
  })

  const words = useMemo(() => countWords(text), [text])
  const characters = useMemo(() => text.length, [text])

  if (!editor) return null

  return (
    <div className="tiptap-character-count">
      {showWords && (
        <span>
          {words} {words === 1 ? "palabra" : "palabras"}
        </span>
      )}
      {showWords && showCharacters && <span aria-hidden="true">·</span>}
      {showCharacters && (
        <span>
          {characters} {characters === 1 ? "carácter" : "caracteres"}
        </span>
      )}
    </div>
  )
}

export default WordCharacterCount