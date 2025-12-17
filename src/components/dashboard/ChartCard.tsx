import { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  children: ReactNode
  subtitle?: string
  action?: ReactNode
}

export default function ChartCard({ title, children, subtitle, action }: ChartCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
        {action && (
          <div>{action}</div>
        )}
      </div>
      <div className="h-80">
        {children}
      </div>
    </div>
  )
}