import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import Button from './Button'

/**
 * Neo-brutalist Modal
 */
export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  const overlayRef = useRef(null)

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className={`relative w-full ${maxWidth} bg-white border-4 border-black shadow-neo-xl animate-slide-in max-h-[90vh] overflow-y-auto`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-black p-4 bg-neo-secondary">
          <h2 id="modal-title" className="font-black text-lg uppercase tracking-wide">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 border-3 border-black bg-white hover:bg-neo-accent hover:text-white transition-colors duration-100"
            aria-label="Close"
          >
            <X strokeWidth={3} className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
