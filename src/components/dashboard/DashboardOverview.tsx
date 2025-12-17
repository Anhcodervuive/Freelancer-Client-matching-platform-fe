import { useQuery } from '@tanstack/react-query'
import { 
  Users, 
  Briefcase, 
  FileText, 
  DollarSign, 
  AlertTriangle, 
  Star,
  TrendingUp,
  Calendar,
  Target,
  Award
} from 'lucide-react'

import dashboardStatsApi from '~/apis/dashboard-stats.api'
import StatsCard from './StatsCard'
import ChartCard from './ChartCard'
import LoadingSpinner from '~/components/ui/LoadingSpinner'
import { formatCurrency } from '~/utils/format'

export default function DashboardOverview() {
  const { data: overview, isLoading, error } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardStatsApi.getDashboardOverview,
    refetchInterval: 5 * 60 * 1000 // Refetch every 5 minutes
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
        <p className="text-red-800">Không thể tải dữ liệu thống kê. Vui lòng thử lại sau.</p>
      </div>
    )
  }

  if (!overview) return null

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Tổng quan hệ thống</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Tổng người dùng"
            value={overview.users.total}
            icon={<Users className="w-6 h-6" />}
            trend={{
              value: overview.users.growthRate,
              label: 'so với tháng trước'
            }}
            subtitle={`${overview.users.newThisMonth} người dùng mới tháng này`}
            color="blue"
          />
          
          <StatsCard
            title="Tổng công việc"
            value={overview.jobs.total}
            icon={<Briefcase className="w-6 h-6" />}
            subtitle={`${overview.jobs.published} đang mở, ${overview.jobs.closed} đã đóng`}
            color="green"
          />
          
          <StatsCard
            title="Hợp đồng"
            value={overview.contracts.total}
            icon={<FileText className="w-6 h-6" />}
            trend={{
              value: overview.contracts.successRate,
              label: 'tỷ lệ thành công'
            }}
            subtitle={`${overview.contracts.active} đang hoạt động`}
            color="purple"
          />
          
          <StatsCard
            title="Doanh thu"
            value={formatCurrency(overview.financial.totalRevenue, 'USD')}
            icon={<DollarSign className="w-6 h-6" />}
            subtitle={`${formatCurrency(overview.financial.monthlyRevenue, 'USD')} tháng này`}
            color="indigo"
          />
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Tranh chấp"
          value={overview.disputes.total}
          icon={<AlertTriangle className="w-6 h-6" />}
          trend={{
            value: overview.disputes.resolutionRate,
            label: 'tỷ lệ giải quyết'
          }}
          subtitle={`${overview.disputes.open} đang mở`}
          color="yellow"
        />
        
        <StatsCard
          title="Đánh giá trung bình"
          value={overview.quality.averageRating.toFixed(1)}
          icon={<Star className="w-6 h-6" />}
          trend={{
            value: overview.quality.positiveRate,
            label: 'đánh giá tích cực'
          }}
          subtitle={`${overview.quality.totalFeedbacks} đánh giá`}
          color="green"
        />
        
        <StatsCard
          title="Tỷ lệ hoàn thành"
          value={`${overview.quality.completionRate.toFixed(1)}%`}
          icon={<Target className="w-6 h-6" />}
          subtitle="Hợp đồng hoàn thành thành công"
          color="blue"
        />
        
        <StatsCard
          title="Đúng hạn"
          value={`${overview.quality.onTimeRate.toFixed(1)}%`}
          icon={<Calendar className="w-6 h-6" />}
          subtitle="Milestone hoàn thành đúng hạn"
          color="purple"
        />
      </div>

      {/* User Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Client"
          value={overview.users.clients}
          icon={<Users className="w-6 h-6" />}
          subtitle={`${((overview.users.clients / overview.users.total) * 100).toFixed(1)}% tổng người dùng`}
          color="blue"
        />
        
        <StatsCard
          title="Freelancer"
          value={overview.users.freelancers}
          icon={<Award className="w-6 h-6" />}
          subtitle={`${((overview.users.freelancers / overview.users.total) * 100).toFixed(1)}% tổng người dùng`}
          color="green"
        />
        
        <StatsCard
          title="Người dùng hoạt động"
          value={overview.users.activeUsers}
          icon={<TrendingUp className="w-6 h-6" />}
          subtitle="Hoạt động trong 30 ngày qua"
          color="purple"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <ChartCard
          title="Xu hướng doanh thu"
          subtitle="12 tháng gần nhất"
        >
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Biểu đồ sẽ được hiển thị ở đây</p>
              <p className="text-sm text-gray-400 mt-2">
                Tích hợp với thư viện chart như Chart.js hoặc Recharts
              </p>
            </div>
          </div>
        </ChartCard>

        {/* User Growth */}
        <ChartCard
          title="Tăng trưởng người dùng"
          subtitle="12 tháng gần nhất"
        >
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Biểu đồ sẽ được hiển thị ở đây</p>
              <p className="text-sm text-gray-400 mt-2">
                Hiển thị xu hướng tăng trưởng người dùng theo thời gian
              </p>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Popular Skills & Market Demand */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Skills */}
        <ChartCard
          title="Kỹ năng phổ biến"
          subtitle="Top 10 kỹ năng được yêu cầu nhiều nhất"
        >
          <div className="space-y-3">
            {overview.trends.popularSkills.slice(0, 10).map((skill, index) => (
              <div key={skill.skillName} className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-500 w-6 flex-shrink-0">
                    #{index + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900 truncate" title={skill.skillName}>
                    {skill.skillName}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <span className="text-sm text-gray-600">{skill.demand}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    skill.growth > 0 
                      ? 'bg-green-100 text-green-800' 
                      : skill.growth < 0 
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {skill.growth > 0 ? '+' : ''}{skill.growth.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Market Demand */}
        <ChartCard
          title="Nhu cầu thị trường"
          subtitle="Theo chuyên ngành"
        >
          <div className="space-y-3">
            {overview.trends.marketDemand.slice(0, 10).map((market, index) => (
              <div key={market.specialtyName} className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-500 w-6 flex-shrink-0">
                    #{index + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900 truncate" title={market.specialtyName}>
                    {market.specialtyName}
                  </span>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="text-sm text-gray-900 font-medium">
                    {market.jobs} jobs
                  </div>
                  <div className="text-xs text-gray-500">
                    Avg: {formatCurrency(market.avgBudget, 'USD')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}