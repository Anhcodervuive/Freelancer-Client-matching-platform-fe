export default function ConfirmDelete({
	open,
	onClose,
	onConfirm,
	name
}: {
	open: boolean
	onClose: () => void
	onConfirm: () => Promise<void>
	name: string
}) {
	return (
		<dialog className={`modal ${open ? 'modal-open' : ''}`}>
			<div className='modal-box'>
				<h3 className='font-bold text-lg'>Delete category</h3>
				<p className='py-3'>
					Are you sure you want to delete <span className='font-medium'>{name}</span>? This action cannot be undone.
				</p>
				<div className='modal-action'>
					<button className='btn' onClick={onClose}>
						Cancel
					</button>
					<button
						className='btn btn-error'
						onClick={async () => {
							await onConfirm()
							onClose()
						}}>
						Delete
					</button>
				</div>
			</div>
			<form method='dialog' className='modal-backdrop'>
				<button onClick={onClose}>close</button>
			</form>
		</dialog>
	)
}
