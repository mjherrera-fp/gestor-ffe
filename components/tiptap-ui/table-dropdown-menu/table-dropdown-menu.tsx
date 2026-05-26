import { useCallback, useState } from "react"
import type { Editor } from "@tiptap/react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Icons ---
import { ChevronDownIcon } from "@/components/tiptap-icons/chevron-down-icon"
import {
  Table,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  Trash2,
  TableCellsMerge,
  TableCellsSplit,
  Heading,
} from "lucide-react"

import { useTableDropdownMenu } from "@/components/tiptap-ui/table-dropdown-menu/use-table-dropdown-menu"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/tiptap-ui-primitive/dropdown-menu"

export interface TableDropdownMenuProps extends Omit<ButtonProps, "type"> {
  editor?: Editor
  hideWhenUnavailable?: boolean
  modal?: boolean
}

export function TableDropdownMenu({
  editor: providedEditor,
  hideWhenUnavailable = false,
  modal = true,
  ...props
}: TableDropdownMenuProps) {
  const { editor } = useTiptapEditor(providedEditor)
  const [isOpen, setIsOpen] = useState(false)

  const {
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
    Icon,
  } = useTableDropdownMenu({ editor, hideWhenUnavailable })

  const handleOnOpenChange = useCallback(
    (open: boolean) => { setIsOpen(open) },
    []
  )

  if (!isVisible) return null

  return (
    <DropdownMenu modal={modal} open={isOpen} onOpenChange={handleOnOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          data-active-state={isTableActive ? "on" : "off"}
          role="button"
          tabIndex={-1}
          aria-label="Table options"
          tooltip="Table"
          {...props}
        >
          <Icon className="tiptap-button-icon" />
          <ChevronDownIcon className="tiptap-button-dropdown-small" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        {!isTableActive ? (
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Button variant="ghost" title="Insertar tabla" onClick={handleInsertTable}>
                <Table size={16} />
              </Button>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        ) : (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Filas</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Button variant="ghost" title="Insertar fila antes" onClick={handleAddRowBefore}>
                  <ArrowUpToLine size={16} />
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Button variant="ghost" title="Insertar fila después" onClick={handleAddRowAfter}>
                  <ArrowDownToLine size={16} />
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Button variant="ghost" title="Eliminar fila" onClick={handleDeleteRow}>
                  <Trash2 size={16} />
                </Button>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuLabel>Columnas</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Button variant="ghost" title="Insertar columna antes" onClick={handleAddColBefore}>
                  <ArrowLeftToLine size={16} />
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Button variant="ghost" title="Insertar columna después" onClick={handleAddColAfter}>
                  <ArrowRightToLine size={16} />
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Button variant="ghost" title="Eliminar columna" onClick={handleDeleteCol}>
                  <Trash2 size={16} />
                </Button>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuLabel>Celdas</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Button variant="ghost" title="Unir celdas" onClick={handleMergeCells}>
                  <TableCellsMerge size={16} />
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Button variant="ghost" title="Dividir celda" onClick={handleSplitCell}>
                  <TableCellsSplit size={16} />
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Button variant="ghost" title="Alternar cabecera" onClick={handleToggleHeaderRow}>
                  <Heading size={16} />
                </Button>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default TableDropdownMenu
