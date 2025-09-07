import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { routes } from '~/config/routes'
import { usePaymentMethods } from '~/hooks/api/usePaymentMethod'
import type { PaymentMethod } from '~/types/payment-method'

function brandLabel(b?: string | null) {
	const s = (b || '').toLowerCase()
	if (s.includes('visa')) return 'Visa'
	if (s.includes('master')) return 'Mastercard'
	if (s.includes('amex')) return 'American Express'
	if (s.includes('discover')) return 'Discover'
	return 'Card'
}

function PMRow({
	item,
	primary = false,
	onEdit,
	onRemove,
	onMakePrimary
}: {
	item: PaymentMethod
	primary?: boolean
	onEdit: () => void
	onRemove: () => void
	onMakePrimary?: () => void
}) {
	return (
		<div className='flex items-center justify-between border rounded-xl p-4'>
			<div className='flex items-center gap-4'>
				<div className='text-2xl'>💳</div>
				<div>
					<div className='font-medium'>
						{brandLabel(item.brand)}
						{item.last4 ? ` ending in ${item.last4}` : ''}
						{primary && <span className='badge badge-primary badge-outline ml-2'>Primary</span>}
					</div>
					<div className='text-sm opacity-70'>
						{item.expMonth && item.expYear ? `Exp ${item.expMonth}/${String(item.expYear).slice(-2)}` : '—'}
					</div>
				</div>
			</div>

			<div className='flex items-center'>
				<button
					className='btn btn-ghost text-success'
					onClick={() => {
						onEdit()
					}}>
					Edit
				</button>
				{!primary && onMakePrimary && (
					<button className='btn btn-ghost text-primary' onClick={onMakePrimary}>
						Make primary
					</button>
				)}
				<button className='btn btn-ghost text-error' onClick={onRemove}>
					Remove
				</button>
			</div>
		</div>
	)
}

export default function BillingCenter() {
	const {
		methods,
		primary,
		isLoading,
		error,
		setDefault,
		settingDefault,
		remove,
		removing
		// updateBilling, // nếu bạn có modal Edit, dùng sau
	} = usePaymentMethods() // (mode 'pm')
	const navigate = useNavigate()
	const others = useMemo(() => (methods as PaymentMethod[]).filter(m => !m.isDefault), [methods])
	const loading = isLoading || settingDefault || removing

	return (
		<div className='max-w-3xl'>
			{/* Header */}
			<h2 className='text-3xl font-semibold mb-1'>Billing & payments</h2>
			<p className='text-sm opacity-70 mb-6'>Manage billing methods</p>

			{/* Main card (giống Upwork section) */}
			{loading ? (
				<div className='flex items-center justify-center gap-3 w-full h-96'>
					<span className='loading loading-spinner' /> Loading…
				</div>
			) : (
				<div className='card bg-base-100 shadow-xl'>
					<div className='card-body space-y-6'>
						{error && <div className='alert alert-error'>{String(error)}</div>}

						{/* PRIMARY */}
						<section>
							<h3 className='text-lg font-medium'>Primary</h3>
							<p className='mb-6 font-light text-sm'>Your primary billing method is used for all recurring payments.</p>
							{primary ? (
								<PMRow
									item={primary as PaymentMethod}
									primary
									onEdit={() => {
										/* open your edit modal here */
										navigate(routes.me.setting.payment.edit(primary!.id))
									}}
									onRemove={() => remove(primary!.id)}
								/>
							) : (
								<div className='text-sm opacity-70 italic'>No primary method yet.</div>
							)}
						</section>

						{/* OTHERS */}
						{others.length > 0 && (
							<section>
								<h3 className='text-lg font-medium mb-2'>Other methods</h3>
								<div className='space-y-3'>
									{others.map(m => (
										<PMRow
											key={m.id}
											item={m}
											onEdit={() => {
												navigate(routes.me.setting.payment.edit(m.id))
											}}
											onRemove={() => remove(m.id)}
											onMakePrimary={() => setDefault(m.id)}
										/>
									))}
								</div>
							</section>
						)}

						{/* ADD */}
						<Link to={routes.me.setting.payment.create} className='btn btn-ghost text-primary gap-2 w-fit'>
							<span className='text-xl'>+</span>
							Add a billing method
						</Link>
					</div>
				</div>
			)}
		</div>
	)
}
