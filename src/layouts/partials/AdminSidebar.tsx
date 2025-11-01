import { NavLink, useLocation } from 'react-router-dom'
import {
        LayoutDashboard,
        FolderKanban,
        BadgeDollarSign,
        PanelLeftOpen,
        Settings,
        ChevronDown,
        ChevronLeft,
        ChevronRight,
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
        { label: 'Overview', to: '/admin', icon: <LayoutDashboard size={18} /> },
        { label: 'Messages', to: routes.admin.messages, icon: <MessageSquare size={18} /> },
        { label: 'Projects', to: '/admin/projects', icon: <FolderKanban size={18} /> },
        { label: 'Disputes', to: routes.admin.dispute.list, icon: <BadgeDollarSign size={18} /> },
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

function ItemLink({ item, collapsed }: { item: Item; collapsed: boolean }) {
        return (
                <NavLink
                        to={item.to}
                        end
                        className={({ isActive }) =>
                                [
                                        'group flex w-full rounded-xl transition',
                                        collapsed
                                                ? 'flex-col items-center justify-center gap-1 px-2 py-3 text-xs'
                                                : 'items-center gap-3 px-3 py-2 text-sm',
                                        isActive ? 'bg-primary/10 text-primary font-medium' : 'text-base-content/80 hover:bg-base-200'
                                ].join(' ')
                        }
                        title={collapsed ? item.label : undefined}
                        aria-label={collapsed ? item.label : undefined}>
                        <span className='shrink-0'>{item.icon}</span>
                        <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
                </NavLink>
        )
}

function Collapsible({ item, collapsed }: { item: Item; collapsed: boolean }) {
        const { pathname } = useLocation()
        const isActive = useMemo(
                () => (item.children ?? []).some(ch => pathname.startsWith(ch.to)),
                [pathname, item.children]
        )
        const [open, setOpen] = useState(isActive)
        useEffect(() => setOpen(isActive), [isActive])

        if (collapsed) {
                return (
                        <div className='relative group'>
                                <button
                                        type='button'
                                        title={item.label}
                                        aria-label={item.label}
                                        className={[
                                                'w-full flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 text-xs transition',
                                                isActive
                                                        ? 'bg-primary/10 text-primary font-medium'
                                                        : 'text-base-content/80 hover:bg-base-200'
                                        ].join(' ')}>
                                        <span className='shrink-0'>{item.icon}</span>
                                        <ChevronRight size={16} className='opacity-60' />
                                </button>
                                <div className='absolute left-full top-0 z-20 ml-2 hidden min-w-[14rem] rounded-xl border border-base-200 bg-base-100 p-3 shadow-xl group-hover:block group-focus-within:block'>
                                        <p className='text-xs font-semibold uppercase tracking-wide text-base-content/60'>
                                                {item.label}
                                        </p>
                                        <ul className='mt-2 space-y-1'>
                                                {item.children?.map(ch => (
                                                        <li key={ch.to}>
                                                                <ItemLink item={ch} collapsed={false} />
                                                        </li>
                                                ))}
                                        </ul>
                                </div>
                        </div>
                )
        }

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
                                                                <ItemLink item={ch} collapsed={false} />
                                                        </li>
                                                ))}
                                        </ul>
                                </div>
			</div>
		</div>
	)
}

export default function AdminSidebar() {
        const { pathname } = useLocation()
        const shouldCollapseForChat = pathname.startsWith(routes.admin.messages)
        const [collapsed, setCollapsed] = useState(shouldCollapseForChat)

        useEffect(() => {
                setCollapsed(shouldCollapseForChat)
        }, [shouldCollapseForChat])

        return (
                <div
                        className={[
                                'h-full flex flex-col min-h-[100vh] transition-[width] duration-200 ease-in-out',
                                collapsed ? 'w-20' : 'w-72'
                        ].join(' ')}>
                        {/* Header / brand */}
                        <div
                                className={[
                                        'flex items-center gap-2 border-b border-base-200',
                                        collapsed ? 'px-3 py-4 justify-between' : 'px-4 py-4 justify-between'
                                ].join(' ')}>
                                <div className='flex items-center gap-2'>
                                        <div className='h-9 w-9 rounded-xl bg-primary/15 grid place-items-center'>
                                                <PanelLeftOpen size={18} className='text-primary' />
                                        </div>
                                        {!collapsed && (
                                                <div>
                                                        <h3 className='text-base font-bold'>Workreap-ish</h3>
                                                        <p className='text-xs text-base-content/60'>Admin Console</p>
                                                </div>
                                        )}
                                </div>
                                <button
                                        type='button'
                                        onClick={() => setCollapsed(v => !v)}
                                        className='btn btn-ghost btn-xs text-base-content/70 hover:text-base-content'
                                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                        title={collapsed ? 'Expand' : 'Collapse'}>
                                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                                </button>
                        </div>

                        {/* Scrollable nav */}
                        <div className={['flex-1 overflow-y-auto py-3', collapsed ? 'px-2' : 'px-3'].join(' ')}>
                                <ul className='space-y-1'>
                                        {NAV.map(it =>
                                                it.children ? (
                                                        <li key={it.label}>
                                                                <Collapsible item={it} collapsed={collapsed} />
                                                        </li>
                                                ) : (
                                                        <li key={it.to}>
                                                                <ItemLink item={it} collapsed={collapsed} />
                                                        </li>
                                                )
                                        )}
                                </ul>
                        </div>

                        {/* Footer / logout */}
                        <div className={['border-t border-base-200', collapsed ? 'px-2 py-3' : 'px-3 py-3'].join(' ')}>
                                <NavLink
                                        to='/logout'
                                        className={[
                                                'btn btn-ghost btn-sm w-full justify-start gap-2 text-error/90 hover:text-error',
                                                collapsed ? 'px-0' : ''
                                        ].join(' ')}
                                        aria-label={collapsed ? 'Logout' : undefined}
                                        title={collapsed ? 'Logout' : undefined}>
                                        <svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4' viewBox='0 0 24 24' fill='currentColor'>
                                                <path d='M16 17v-2H9V9h7V7l5 5-5 5z' />
                                                <path d='M14 19H5V5h9V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9z' />
                                        </svg>
                                        <span className={collapsed ? 'sr-only' : undefined}>Logout</span>
                                </NavLink>
                        </div>
                </div>
        )
}
