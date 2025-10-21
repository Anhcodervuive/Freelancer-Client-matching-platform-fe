import { NavLink, useLocation } from 'react-router-dom'
import {
        LayoutDashboard,
        FolderKanban,
        ListChecks,
        CalendarDays,
        BadgeDollarSign,
        ReceiptText,
        PanelLeftOpen,
        Settings,
        ChevronDown,
        Boxes,
        Tags,
        Hammer,
        Network,
        MessageSquare
} from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { routes } from '~/config/routes'

type Item = {
	label: string
	to: string
	icon?: React.ReactNode
	children?: Item[]
}

const NAV: Item[] = [
        { label: 'Insights', to: '/admin', icon: <LayoutDashboard size={18} /> },
        { label: 'Messages', to: routes.admin.messages, icon: <MessageSquare size={18} /> },
	{ label: 'Manage projects', to: '/admin/projects', icon: <FolderKanban size={18} /> },
	{ label: 'Manage task', to: '/admin/tasks', icon: <ListChecks size={18} /> },
	{ label: 'Manage meetings', to: '/admin/meetings', icon: <CalendarDays size={18} /> },
        { label: 'Disputes', to: routes.admin.dispute.list, icon: <BadgeDollarSign size={18} /> },
	{ label: 'Invoices', to: '/admin/invoices', icon: <ReceiptText size={18} /> },
	{
		label: 'Taxonomy',
		to: '#',
		icon: <Boxes size={18} />,
		children: [
			{ label: 'Categories', to: '/admin/categories', icon: <Network size={16} /> },
			{ label: 'Specialties', to: '/admin/specialties', icon: <Tags size={16} /> },
			{ label: 'Skills', to: '/admin/skills', icon: <Hammer size={16} /> }
		]
	},
	{ label: 'Account settings', to: '/admin/settings', icon: <Settings size={18} /> }
]

function ItemLink({ item }: { item: Item }) {
	return (
		<NavLink
			to={item.to}
			end
			className={({ isActive }) =>
				[
					'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition',
					isActive ? 'bg-primary/10 text-primary font-medium' : 'text-base-content/80 hover:bg-base-200'
				].join(' ')
			}>
			<span className='shrink-0'>{item.icon}</span>
			<span className='truncate'>{item.label}</span>
		</NavLink>
	)
}

function Collapsible({ item }: { item: Item }) {
	const { pathname } = useLocation()
	const shouldOpen = useMemo(
		() => (item.children ?? []).some(ch => pathname.startsWith(ch.to)),
		[pathname, item.children]
	)
	const [open, setOpen] = useState(shouldOpen)
	useEffect(() => setOpen(shouldOpen), [shouldOpen])

	return (
		<div className='rounded-xl'>
			<button
				type='button'
				onClick={() => setOpen(v => !v)}
				className={[
					'w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm',
					open ? 'bg-base-200' : 'hover:bg-base-200'
				].join(' ')}>
				<span className='flex items-center gap-3 text-base-content/80'>
					<span className='shrink-0'>{item.icon}</span>
					<span className='font-medium'>{item.label}</span>
				</span>
				<ChevronDown size={16} className={open ? 'rotate-180 transition' : 'transition'} />
			</button>

			<div
				className={[
					'grid transition-[grid-template-rows] duration-200 ease-in-out',
					open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
				].join(' ')}>
				<div className='overflow-hidden'>
					<ul className='mt-1 pl-2'>
						{item.children?.map(ch => (
							<li key={ch.to} className='mb-1'>
								<ItemLink item={ch} />
							</li>
						))}
					</ul>
				</div>
			</div>
		</div>
	)
}

export default function AdminSidebar() {
	return (
		<div className='h-full flex flex-col min-h-[100vh]'>
			{/* Header / brand */}
			<div className='flex items-center gap-2 px-4 py-4 border-b border-base-200'>
				<div className='h-9 w-9 rounded-xl bg-primary/15 grid place-items-center'>
					<PanelLeftOpen size={18} className='text-primary' />
				</div>
				<div>
					<h3 className='text-base font-bold'>Workreap-ish</h3>
					<p className='text-xs text-base-content/60'>Admin Console</p>
				</div>
			</div>

			{/* Scrollable nav */}
			<div className='flex-1 overflow-y-auto px-3 py-3'>
				<ul className='space-y-1'>
					{NAV.map(it =>
						it.children ? (
							<li key={it.label}>
								<Collapsible item={it} />
							</li>
						) : (
							<li key={it.to}>
								<ItemLink item={it} />
							</li>
						)
					)}
				</ul>
			</div>

			{/* Footer / logout */}
			<div className='px-3 py-3 border-t border-base-200'>
				<NavLink
					to='/logout'
					className='btn btn-ghost btn-sm w-full justify-start gap-2 text-error/90 hover:text-error'>
					<svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4' viewBox='0 0 24 24' fill='currentColor'>
						<path d='M16 17v-2H9V9h7V7l5 5-5 5z' />
						<path d='M14 19H5V5h9V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9z' />
					</svg>
					Logout
				</NavLink>
			</div>
		</div>
	)
}
