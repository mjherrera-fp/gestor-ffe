import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose?: () => void
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'
  zIndex?: number
  backdropClass?: string
  cardClass?: string
}

// Modales abiertos, del mas antiguo al mas reciente. Escape solo debe cerrar el
// de encima: con dos modales anidados (un confirm dentro de otro, por ejemplo)
// cada uno tiene su propio listener en document, asi que una sola pulsacion
// cerraria los dos a la vez.
const pilaModales: symbol[] = []

function useEscape(open: boolean, onClose?: () => void) {
  // El cierre se guarda en un ref para no depender de su identidad: los
  // componentes suelen pasar una flecha inline, que cambia en cada render y
  // provocaria resuscripciones continuas del listener.
  const refCierre = useRef(onClose)
  refCierre.current = onClose

  useEffect(() => {
    if (!open) return

    const id = Symbol('modal')
    pilaModales.push(id)

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (pilaModales[pilaModales.length - 1] !== id) return
      refCierre.current?.()
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      const i = pilaModales.indexOf(id)
      if (i !== -1) pilaModales.splice(i, 1)
    }
  }, [open])
}

// Bloqueo de scroll con recuento de referencias. Guardar el valor anterior y
// restaurarlo al cerrar no vale con modales anidados: A abre (hidden), B abre
// (hidden), A cierra y restaura '', dejando el body con scroll mientras B sigue
// abierto, y al cerrar B restaura 'hidden' y congela la pagina para siempre.
let bloqueosActivos = 0

function usePreventBodyScroll(open: boolean) {
  useEffect(() => {
    if (!open) return

    bloqueosActivos++
    if (bloqueosActivos === 1) {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      bloqueosActivos--
      if (bloqueosActivos === 0) {
        document.body.style.overflow = ''
      }
    }
  }, [open])
}

const maxWidthMap: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
}

export function Modal({
  open,
  onClose,
  children,
  maxWidth = 'md',
  zIndex = 50,
  backdropClass = 'bg-overlay backdrop-blur-sm mb-0',
  cardClass = '',
}: ModalProps) {
  usePreventBodyScroll(open)
  useEscape(open, onClose)
  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={`fixed inset-0 ${backdropClass} flex items-center justify-center p-4`}
          style={{ zIndex }}
          onClick={onClose}
        >
          <motion.div
            key="modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
            className={`bg-surface-card rounded-2xl shadow-2xl w-full max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden ${maxWidthMap[maxWidth] || maxWidth} ${cardClass}`}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Modal
