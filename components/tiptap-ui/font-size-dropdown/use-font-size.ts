"use client"

import { useEffect, useState } from "react"
import { type Editor } from "@tiptap/react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Lib ---
import { isExtensionAvailable } from "@/lib/tiptap-utils"

// --- Icons ---
import { TextSizeIcon } from "@/components/tiptap-icons/text-size-icon"

export interface FontSizeItem {
  label: string
  value: string
}

export const FONT_SIZE_OPTIONS: FontSizeItem[] = [
  { label: "Auto", value: "" },
  { label: "12 PX", value: "12px" },
  { label: "14 PX", value: "14px" },
  { label: "15 PX", value: "15px" },
  { label: "16 PX", value: "16px" },
  { label: "18 PX", value: "18px" },
  { label: "20 PX", value: "20px" },
  { label: "24 PX", value: "24px" },
  { label: "32 PX", value: "32px" },
]

export interface UseFontSizeConfig {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null
  /**
   * Whether the dropdown should be hidden when the extension is unavailable.
   * @default false
   */
  hideWhenUnavailable?: boolean
}

/**
 * Checks if the font size extension is available in the editor
 */
export function isFontSizeAvailable(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false
  return isExtensionAvailable(editor, "textStyle")
}

/**
 * Gets the currently applied font size
 */
export function getActiveFontSize(
  editor: Editor | null
): string | null | undefined {
  if (!editor || !editor.isEditable) return undefined
  return editor.getAttributes("textStyle").fontSize as string | null | undefined
}

/**
 * Custom hook that provides font size functionality for the editor
 */
export function useFontSize(config?: UseFontSizeConfig) {
  const { editor: providedEditor, hideWhenUnavailable = false } = config || {}

  const { editor } = useTiptapEditor(providedEditor)
  const [isVisible, setIsVisible] = useState<boolean>(true)
  const canSet = isFontSizeAvailable(editor)
  const activeFontSize = getActiveFontSize(editor)

  useEffect(() => {
    if (!editor) return

    const handleSelectionUpdate = () => {
      if (!hideWhenUnavailable) {
        setIsVisible(true)
        return
      }
      setIsVisible(isFontSizeAvailable(editor))
    }

    handleSelectionUpdate()

    editor.on("selectionUpdate", handleSelectionUpdate)

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate)
    }
  }, [editor, hideWhenUnavailable])

  const setFontSize = (fontSize: string) => {
    if (!editor || !canSet) return false
    if (fontSize) {
      return editor.chain().focus().setFontSize(fontSize).run()
    }
    return editor.chain().focus().unsetFontSize().run()
  }

  return {
    isVisible,
    canSet,
    activeFontSize,
    setFontSize,
    label: "Font size",
    Icon: TextSizeIcon,
  }
}

export default useFontSize