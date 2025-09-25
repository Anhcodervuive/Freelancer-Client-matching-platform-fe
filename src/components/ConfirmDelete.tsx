import type { ReactNode } from 'react'

type ConfirmDeleteProps = {
        open: boolean
        onClose: () => void
        onConfirm: () => Promise<void> | void
        name?: string
        title?: string
        description?: ReactNode
        confirmLabel?: string
        cancelLabel?: string
        isProcessing?: boolean
}

export default function ConfirmDelete({
        open,
        onClose,
        onConfirm,
        name,
        title = 'Delete item',
        description,
        confirmLabel = 'Delete',
        cancelLabel = 'Cancel',
        isProcessing = false
}: ConfirmDeleteProps) {
        const handleClose = () => {
                if (isProcessing) return
                onClose()
        }

        return (
                <dialog className={`modal ${open ? 'modal-open' : ''}`}>
                        <div className='modal-box'>
                                <h3 className='text-lg font-semibold text-base-content'>{title}</h3>
                                <div className='py-3 text-sm text-base-content/80'>
                                        {description ?? (
                                                <p>
                                                        Are you sure you want to delete{' '}
                                                        {name ? <span className='font-medium text-base-content'>{name}</span> : 'this item'}? This
                                                        action cannot be undone.
                                                </p>
                                        )}
                                </div>
                                <div className='modal-action'>
                                        <button className='btn' onClick={handleClose} disabled={isProcessing}>
                                                {cancelLabel}
                                        </button>
                                        <button
                                                className='btn btn-error'
                                                disabled={isProcessing}
                                                onClick={async () => {
                                                        await onConfirm()
                                                        onClose()
                                                }}>
                                                {isProcessing ? 'Deleting…' : confirmLabel}
                                        </button>
                                </div>
                        </div>
                        <form method='dialog' className='modal-backdrop'>
                                <button onClick={handleClose} disabled={isProcessing}>
                                        close
                                </button>
                        </form>
                </dialog>
        )
}
