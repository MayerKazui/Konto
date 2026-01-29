import React from 'react';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children, footer }: ModalProps) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                        {title}
                    </h2>
                    <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                </div>

                <div className="p-4">
                    {children}
                </div>

                {footer && (
                    <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-lg">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
