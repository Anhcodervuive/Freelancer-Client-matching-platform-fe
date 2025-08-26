import { LogOut, Wallet } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const Item = ({ to, label, icon }: { to: string; label: string; icon?: React.ReactNode }) => (
	<NavLink
		to={to}
		end
		className={({ isActive }) =>
			`flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-base-200 ${
				isActive ? 'bg-base-200 font-medium' : ''
			}`
		}>
		{icon}
		<span>{label}</span>
	</NavLink>
)

export default function AdminSidebar() {
	return (
		<div className='h-dvh sticky top-0 space-y-3 '>
			{/* Logo */}
			<div className='p-3'>
				<div className='flex items-center gap-2 px-2 py-1'>
					<span className='inline-flex size-8 rounded-full bg-primary' />
					<p className='font-bold'>Workreap-ish</p>
				</div>
				<div className='menu space-y-1'>
					<Item to='/admin' label='Insights' />
					<Item to='/admin/projects' label='Manage projects' />
					<Item to='/admin/tasks' label='Manage task' />
					<Item to='/admin/meetings' label='Manage meetings' />
					<Item to='/admin/disputes' label='Disputes' />
					<Item to='/admin/invoices' label='Invoices' />
					<Item to='/admin/settings' label='Account settings' />
				</div>
			</div>

			<div className='flex items-center justify-between mt-2 p-4 text-xs text-base-content/60 bg-gradient-to-r from-[#fdf9ff] to-[#f2fbff] border-t border-b border-gray-300'>
				<div className='flex items-center justify-center gap-3'>
					<Wallet />
					Account balance:
				</div>
				$1,080
			</div>
			<button className='btn btn-sm btn-ghost mt-2 ml-3'>
				<LogOut /> Logout
			</button>
		</div>
	)
}
