import { motion, AnimatePresence } from 'motion/react'
import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose?: () => void
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'
  zIndex?: number
  backdropClass?: string
  cardClass?: string
}

function usePreventBodyScroll(open: boolean) {
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
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
