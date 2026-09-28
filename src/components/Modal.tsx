// File: d:\Robo_Mob\Robo-Controller\smartmove\src\components\Modal.tsx

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  /** Controls whether the modal is rendered and visible */
  isOpen: boolean;
  /** Called when the user closes the modal (backdrop click, Esc key, or × button) */
  onClose: () => void;
  /** Text shown in the modal header */
  title: string;
  /** Content rendered in the scrollable body */
  children: React.ReactNode;
  /** Width variant: sm = max-w-md | md = max-w-xl | lg = max-w-2xl */
  size?: ModalSize;
}

// ─── Size map ─────────────────────────────────────────────────────────────────

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Modal – accessible dialog overlay.
 *
 * Features:
 * - Semi-transparent dark backdrop
 * - Centered dialog panel with fade + scale-in animation
 * - Sticky header with title and × close button
 * - Scrollable body area (max-height capped so it never overflows the viewport)
 * - Closes on Escape key press or backdrop click
 * - Focus-traps are not implemented here (use a library like focus-trap-react
 *   in production); the dialog div is auto-focused on mount to enable Esc.
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    // Lock body scroll while the modal is open
    document.body.style.overflow = 'hidden';

    // Focus the dialog so keyboard events are captured immediately
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Don't render anything when closed
  if (!isOpen) return null;

  return (
    <>
      {/*
        Inject CSS animations into <head> once.
        Using a <style> tag here is acceptable for a self-contained component;
        no external CSS file is needed.
      */}
      <style>{`
        @keyframes sm-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes sm-dialog-in {
          from { opacity: 0; transform: scale(0.95) translateY(-8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0px);  }
        }
        .sm-backdrop {
          animation: sm-backdrop-in 180ms ease forwards;
        }
        .sm-dialog {
          animation: sm-dialog-in 200ms ease forwards;
        }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        className="
          sm-backdrop
          fixed inset-0 z-50
          flex items-center justify-center
          p-4
        "
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
        onClick={onClose}           // Click outside → close
      >
        {/* ── Dialog panel ── */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()} // Prevent backdrop click from firing
          className={[
            'sm-dialog',
            'relative w-full',
            SIZE_CLASS[size],
            'bg-white rounded-2xl shadow-2xl',
            'flex flex-col',
            'max-h-[90vh]',
            'outline-none',
          ].join(' ')}
        >
          {/* ── Header ── */}
          <div
            className="
              flex items-center justify-between
              px-6 py-4
              border-b border-gray-200
              shrink-0
              rounded-t-2xl
            "
            style={{ backgroundColor: '#0f2044' }}
          >
            <h2
              id="modal-title"
              className="text-base font-semibold text-white truncate pr-4"
            >
              {title}
            </h2>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="
                flex items-center justify-center
                w-8 h-8 rounded-lg
                text-gray-300 hover:text-white hover:bg-white/10
                transition-colors duration-100
                shrink-0
              "
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div className="overflow-y-auto flex-1 px-6 py-5">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;
