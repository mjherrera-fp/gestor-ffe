"use client"

import { forwardRef, useMemo, useRef, useState } from "react"
import { type Editor } from "@tiptap/react"

// --- Hooks ---
import { useMenuNavigation } from "@/hooks/use-menu-navigation"
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint"
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Icons ---
import { BanIcon } from "@/components/tiptap-icons/ban-icon"
import { BaselineIcon } from "@/components/tiptap-icons/baseline-icon"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/tiptap-ui-primitive/popover"
import { Separator } from "@/components/tiptap-ui-primitive/separator"
import {
  Card,
  CardBody,
  CardItemGroup,
} from "@/components/tiptap-ui-primitive/card"
import { ButtonGroup } from "@/components/tiptap-ui-primitive/button-group"

// --- Styles ---
import "./text-color-popover.scss"

export interface TextColor {
  label: string
  value: string
}

export const TEXT_COLORS: TextColor[] = [
  { label: "Negro", value: "#111111" },
  { label: "Gris", value: "#64748b" },
  { label: "Rojo", value: "#dc2626" },
  { label: "Naranja", value: "#ea580c" },
  { label: "Ámbar", value: "#d97706" },
  { label: "Verde", value: "#16a34a" },
  { label: "Esmeralda", value: "#059669" },
  { label: "Azul", value: "#2563eb" },
  { label: "Cian", value: "#0891b2" },
  { label: "Violeta", value: "#7c3aed" },
  { label: "Magenta", value: "#c026d3" },
  { label: "Rosa", value: "#db2777" },
]

export interface TextColorPopoverContentProps {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null
  /**
   * Optional colors to use in the text color popover.
   * If not provided, defaults to a predefined set of colors.
   */
  colors?: TextColor[]
}

export interface TextColorPopoverProps
  extends
    Omit<ButtonProps, "type">,
    Pick<UseTextColorConfig, "editor" | "hideWhenUnavailable" | "onApplied"> {
  /**
   * Optional colors to use in the text color popover.
   * If not provided, defaults to a predefined set of colors.
   */
  colors?: TextColor[]
}

// --- Helpers ---

function canSetTextColor(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false
  if (!editor?.can?.()) return false
  try {
    return editor.can().setColor("#111111")
  } catch {
    return false
  }
}

function getActiveColor(editor: Editor | null): string | null {
  if (!editor) return null
  try {
    return (editor.getAttributes("textStyle").color as string) || null
  } catch {
    return null
  }
}

function isTextColorActive(editor: Editor | null, color: string): boolean {
  if (!editor) return false
  try {
    return editor.isActive("textStyle", { color }) 
  } catch {
    return false
  }
}

export type UseTextColorConfig = {
  editor?: Editor | null
  hideWhenUnavailable?: boolean
  onApplied?: ({ color, label }: { color: string; label: string }) => void
}

export function useTextColor(config: UseTextColorConfig) {
  const {
    editor: providedEditor,
    hideWhenUnavailable = false,
    onApplied,
  } = config

  const { editor } = useTiptapEditor(providedEditor)
  const canColor = canSetTextColor(editor)
  const activeColor = getActiveColor(editor)
  const label = activeColor ? "Color de texto activo" : "Color de texto"

  const shouldShow = useMemo(() => {
    if (!editor) return false
    if (!hideWhenUnavailable) return true
    return canColor
  }, [editor, hideWhenUnavailable, canColor])

  const applyColor = (color: string) => {
    if (!editor || !canColor) return false
    const success = editor.chain().focus().setColor(color).run()
    if (success) {
      onApplied?.({ color, label })
    }
    return success
  }

  const removeColor = () => {
    if (!editor || !canColor) return false
    const success = editor.chain().focus().unsetColor().run()
    if (success) {
      onApplied?.({ color: "", label })
    }
    return success
  }

  return {
    isVisible: shouldShow,
    canColor,
    activeColor,
    isActive: (color: string) => isTextColorActive(editor, color),
    applyColor,
    removeColor,
    label,
  }
}

export interface TextColorPopoverButtonProps extends ButtonProps {
  activeColor?: string | null
}

export const TextColorPopoverButton = forwardRef<
  HTMLButtonElement,
  TextColorPopoverButtonProps
>(({ className, children, activeColor, ...props }, ref) => (
  <Button
    type="button"
    className={className}
    variant="ghost"
    data-appearance="default"
    role="button"
    tabIndex={-1}
    aria-label="Color de texto"
    tooltip="Color de texto"
    ref={ref}
    {...props}
  >
    {children ?? (
      <BaselineIcon
        className="tiptap-button-icon"
        color={activeColor || undefined}
      />
    )}
  </Button>
))

TextColorPopoverButton.displayName = "TextColorPopoverButton"

export function TextColorPopoverContent({
  editor,
  colors = TEXT_COLORS,
}: TextColorPopoverContentProps) {
  const { activeColor, applyColor, removeColor } = useTextColor({ editor })
  const isMobile = useIsBreakpoint()
  const containerRef = useRef<HTMLDivElement>(null)

  const menuItems = useMemo(
    () => [...colors, { label: "Remove color", value: "" }],
    [colors]
  )

  const { selectedIndex } = useMenuNavigation({
    containerRef,
    items: menuItems,
    orientation: "both",
    onSelect: (item) => {
      if (!containerRef.current) return false
      const highlightedElement = containerRef.current.querySelector(
        '[data-highlighted="true"]'
      ) as HTMLElement
      if (highlightedElement) highlightedElement.click()
      if (item.value === "") removeColor()
      return true
    },
    autoSelectFirstItem: false,
  })

  return (
    <Card
      ref={containerRef}
      tabIndex={0}
      style={isMobile ? { boxShadow: "none", border: 0 } : {}}
    >
      <CardBody style={isMobile ? { padding: 0 } : {}}>
        <CardItemGroup orientation="horizontal">
          <ButtonGroup>
            {colors.map((color, index) => (
              <ButtonGroup key={color.value}>
                <Button
                  type="button"
                  variant="ghost"
                  role="menuitem"
                  tabIndex={index === selectedIndex ? 0 : -1}
                  data-highlighted={selectedIndex === index}
                  data-active-state={
                    activeColor === color.value ? "on" : "off"
                  }
                  aria-label={color.label}
                  tooltip={color.label}
                  onClick={() => applyColor(color.value)}
                  style={{ "--text-color": color.value } as React.CSSProperties}
                >
                  <span
                    className="tiptap-button-text-color"
                    style={{ backgroundColor: color.value }}
                  />
                </Button>
              </ButtonGroup>
            ))}
          </ButtonGroup>
          <Separator />
          <ButtonGroup>
            <Button
              onClick={removeColor}
              aria-label="Quitar color"
              tooltip="Quitar color"
              tabIndex={selectedIndex === colors.length ? 0 : -1}
              type="button"
              role="menuitem"
              variant="ghost"
              data-highlighted={selectedIndex === colors.length}
            >
              <BanIcon className="tiptap-button-icon" />
            </Button>
          </ButtonGroup>
        </CardItemGroup>
      </CardBody>
    </Card>
  )
}

export function TextColorPopover({
  editor: providedEditor,
  colors = TEXT_COLORS,
  hideWhenUnavailable = false,
  onApplied,
  ...props
}: TextColorPopoverProps) {
  const { editor } = useTiptapEditor(providedEditor)
  const [isOpen, setIsOpen] = useState(false)
  const { isVisible, canColor, activeColor, label } = useTextColor({
    editor,
    hideWhenUnavailable,
    onApplied,
  })

  if (!isVisible) return null

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <TextColorPopoverButton
          disabled={!canColor}
          data-active-state={activeColor ? "on" : "off"}
          data-disabled={!canColor}
          aria-pressed={activeColor ? true : false}
          aria-label={label}
          tooltip={label}
          activeColor={activeColor}
          {...props}
        />
      </PopoverTrigger>
      <PopoverContent aria-label="Color de texto">
        <TextColorPopoverContent editor={editor} colors={colors} />
      </PopoverContent>
    </Popover>
  )
}

export default TextColorPopover