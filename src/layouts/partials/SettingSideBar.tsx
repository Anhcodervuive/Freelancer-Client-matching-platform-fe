import { routes } from '~/config/routes'

const items = [
	{ label: 'Membership & Connects' },
	{ label: 'Contact Info', active: true },
	{ label: 'My Profile' },
	{ label: 'Profile Settings' },
	{ label: 'Get Paid' },
	{ label: 'My Teams' },
	{ label: 'Connected Services' },
	{ label: 'Password & Security' },
	{ label: 'Identity Verification', badge: 'New' },
	{ label: 'Notification Settings' },
	{ label: 'Appeals Tracker' }
]
export default function SettingSidebar() {
	return (
		<aside className='w-full'>
			<nav className='menu'>
				<li>
					<h4 className='menu-title'>Billing</h4>
					<ul>
						<li>
							<a className='justify-between' href={routes.me.setting.payment.list}>
								Billing & Payments
							</a>
						</li>
					</ul>
				</li>

				<li>
					<h4 className='menu-title'>User setting</h4>
					<ul>
						{items.map(it => (
							<li key={it.label}>
								<a className={it.active ? 'active font-medium' : ''}>
									{it.label}
									{it.badge && <span className='badge badge-sm badge-primary'>{it.badge}</span>}
								</a>
							</li>
						))}
					</ul>
				</li>
			</nav>
		</aside>
	)
}
