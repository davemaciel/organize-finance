import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Dialog Content */}
            <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-lg animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-lg font-semibold leading-none tracking-tight">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                        <X size={18} />
                        <span className="sr-only">Fechar</span>
                    </button>
                </div>

                <div className="p-6">
                    {children}
                </div>

                {footer && (
                    <div className="flex items-center justify-end p-6 pt-0 gap-2">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

// Sub-component for simple Confirmations
interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary';
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'primary'
}: ConfirmModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="mb-4">
                <p className="text-muted-foreground">{description}</p>
            </div>
            <div className="flex justify-end gap-3">
                <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm font-medium"
                >
                    {cancelText}
                </button>
                <button
                    onClick={() => {
                        onConfirm();
                        onClose();
                    }}
                    className={`px-4 py-2 rounded-lg text-white transition-colors text-sm font-medium ${variant === 'danger'
                            ? 'bg-destructive hover:bg-destructive/90'
                            : 'bg-primary hover:bg-primary/90'
                        }`}
                >
                    {confirmText}
                </button>
            </div>
        </Modal>
    );
}
