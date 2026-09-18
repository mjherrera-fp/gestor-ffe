import { forwardRef, useCallback, useRef, useState } from "react"
import { type Editor } from "@tiptap/react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Icons ---
import { ImagePlusIcon } from "@/components/tiptap-icons/image-plus-icon"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/tiptap-ui-primitive/popover"
import { Card, CardBody, CardItemGroup } from "@/components/tiptap-ui-primitive/card"
import { Input } from "@/components/tiptap-ui-primitive/input"

export interface ImageInsertButtonProps extends Omit<ButtonProps, "type"> {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null
}

/**
 * Button component for inserting an image into a Tiptap editor.
 * Supports inserting by URL or from a local file (read as data URL).
 */
export const ImageInsertButton = forwardRef<
  HTMLButtonElement,
  ImageInsertButtonProps
>(({ editor: providedEditor, onClick, children, ...buttonProps }, ref) => {
  const { editor } = useTiptapEditor(providedEditor)
  const [isOpen, setIsOpen] = useState(false)
  const [url, setUrl] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const insertByUrl = useCallback(() => {
    if (!editor || !url.trim()) return
    editor.chain().focus().setImage({ src: url.trim() }).run()
    setUrl("")
    setIsOpen(false)
  }, [editor, url])

  const insertFile = useCallback(
    (file: File | null) => {
      if (!editor || !file) return
      const reader = new FileReader()
      reader.onload = () => {
        editor.chain().focus().setImage({ src: reader.result as string }).run()
        setIsOpen(false)
      }
      reader.readAsDataURL(file)
    },
    [editor]
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          role="button"
          tabIndex={-1}
          aria-label="Insert image"
          tooltip="Image"
          onClick={onClick}
          {...buttonProps}
          ref={ref}
        >
          {children ?? <ImagePlusIcon className="tiptap-button-icon" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <Card tabIndex={0}>
          <CardBody>
            <CardItemGroup>
              <Button
                type="button"
                variant="primary"
                size="small"
                onClick={() => fileInputRef.current?.click()}
              >
                Subir imagen
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                style={{ display: "none" }}
                onChange={(event) => {
                  insertFile(event.target.files?.[0] ?? null)
                  event.target.value = ""
                }}
              />
            </CardItemGroup>
          </CardBody>
          <CardBody>
            <CardItemGroup>
              <Input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="Pega la URL de la imagen"
              />
              <Button
                type="button"
                variant="primary"
                size="small"
                disabled={!url.trim()}
                onClick={insertByUrl}
              >
                Insertar URL
              </Button>
            </CardItemGroup>
          </CardBody>
        </Card>
      </PopoverContent>
    </Popover>
  )
})

ImageInsertButton.displayName = "ImageInsertButton"

export default ImageInsertButton