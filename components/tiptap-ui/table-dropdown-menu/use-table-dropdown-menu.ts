import { useCallback, useEffect, useState } from "react"
import type { Editor } from "@tiptap/react"
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"
import { TableIcon } from "@/components/tiptap-icons/table-icon"

export interface UseTableDropdownMenuConfig {
  editor?: Editor | null
  hideWhenUnavailable?: boolean
}

export function useTableDropdownMenu(config?: UseTableDropdownMenuConfig) {
  const { editor, hideWhenUnavailable = false } = config || {}
  const { editor: contextEditor } = useTiptapEditor(editor)
  const [isVisible, setIsVisible] = useState(true)

  const isTableActive = contextEditor?.isActive("table") || false

  useEffect(() => {
    if (!contextEditor) return

    const update = () => {
      if (!hideWhenUnavailable) {
        setIsVisible(true)
        return
      }
      setIsVisible(contextEditor.isActive("table"))
    }

    update()
    contextEditor.on("selectionUpdate", update)
    return () => { contextEditor.off("selectionUpdate", update) }
  }, [contextEditor, hideWhenUnavailable])

  const handleInsertTable = useCallback(() => {
    contextEditor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [contextEditor])

  const handleAddRowBefore = useCallback(() => {
    contextEditor?.chain().focus().addRowBefore().run()
  }, [contextEditor])

  const handleAddRowAfter = useCallback(() => {
    contextEditor?.chain().focus().addRowAfter().run()
  }, [contextEditor])

  const handleAddColBefore = useCallback(() => {
    contextEditor?.chain().focus().addColumnBefore().run()
  }, [contextEditor])

  const handleAddColAfter = useCallback(() => {
    contextEditor?.chain().focus().addColumnAfter().run()
  }, [contextEditor])

  const handleDeleteRow = useCallback(() => {
    contextEditor?.chain().focus().deleteRow().run()
  }, [contextEditor])

  const handleDeleteCol = useCallback(() => {
    contextEditor?.chain().focus().deleteColumn().run()
  }, [contextEditor])

  const handleMergeCells = useCallback(() => {
    contextEditor?.chain().focus().mergeCells().run()
  }, [contextEditor])

  const handleSplitCell = useCallback(() => {
    contextEditor?.chain().focus().splitCell().run()
  }, [contextEditor])

  const handleToggleHeaderRow = useCallback(() => {
    contextEditor?.chain().focus().toggleHeaderRow().run()
  }, [contextEditor])

  return {
    isVisible,
    isTableActive,
    handleInsertTable,
    handleAddRowBefore,
    handleAddRowAfter,
    handleAddColBefore,
    handleAddColAfter,
    handleDeleteRow,
    handleDeleteCol,
    handleMergeCells,
    handleSplitCell,
    handleToggleHeaderRow,
    Icon: TableIcon,
    label: "Table",
  }
}
