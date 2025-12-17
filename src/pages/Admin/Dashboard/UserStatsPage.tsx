import { useQuery } from '@tanstack/react-query'
import { Users, UserPlus, Activity } from 'lucide-react'

import dashboardStatsApi from '~/apis/dashboard-stats.api'
import StatsCard from '~/components/dashboard/StatsCard'
import LoadingSpinner from '~/components/ui/LoadingSpinner'

export default function UserStatsPage() {
  const { data: userStats, isLoading, error } = useQuery({
    queryKey: ['user-stats'],
    queryFn: dashboardStatsApi.getUserStats,
    refetchInterval: 5 * 60 * 1000
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">Không thể tải dữ liệu thống kê người dùng. Vui lòng thử lại sau.</p>
      </div>
    )
  }

  if (!userStats) return null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Thống kê người dùng</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Tổng người dùng"
            value={userStats.total}
            icon={<Users className="w-6 h-6" />}
            trend={{
              value: userStats.growthRate,
              label: 'so với tháng trước'
            }}
            color="blue"
          />
          
          <StatsCard
            title="Client"
            value={userStats.clients}
            icon={<Users className="w-6 h-6" />}
            subtitle={`${((userStats.clients / userStats.total) * 100).toFixed(1)}% tổng người dùng`}
            color="green"
          />
          
          <StatsCard
            title="Freelancer"
            value={userStats.freelancers}
            icon={<Users className="w-6 h-6" />}
            subtitle={`${((userStats.freelancers / userStats.total) * 100).toFixed(1)}% tổng người dùng`}
            color="purple"
          />
          
          <StatsCard
            title="Admin"
            value={userStats.admins}
            icon={<Users className="w-6 h-6" />}
            subtitle={`${((userStats.admins / userStats.total) * 100).toFixed(1)}% tổng người dùng`}
            color="indigo"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatsCard
          title="Người dùng mới tháng này"
          value={userStats.newThisMonth}
          icon={<UserPlus className="w-6 h-6" />}
          subtitle="Đăng ký trong tháng hiện tại"
          color="green"
        />
        
        <StatsCard
          title="Người dùng hoạt động"
          value={userStats.activeUsers}
          icon={<Activity className="w-6 h-6" />}
          subtitle="Hoạt động trong 30 ngày qua"
          color="blue"
        />
      </div>
    </div>
  )
}