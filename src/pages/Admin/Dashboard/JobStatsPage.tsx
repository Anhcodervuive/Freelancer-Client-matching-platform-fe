import { useQuery } from '@tanstack/react-query'
import { Briefcase, DollarSign, Target } from 'lucide-react'

import dashboardStatsApi from '~/apis/dashboard-stats.api'
import StatsCard from '~/components/dashboard/StatsCard'
import ChartCard from '~/components/dashboard/ChartCard'
import LoadingSpinner from '~/components/ui/LoadingSpinner'
import { formatCurrency } from '~/utils/format'

export default function JobStatsPage() {
  const { data: jobStats, isLoading, error } = useQuery({
    queryKey: ['job-stats'],
    queryFn: dashboardStatsApi.getJobStats,
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
        <p className="text-red-800">Không thể tải dữ liệu thống kê công việc. Vui lòng thử lại sau.</p>
      </div>
    )
  }

  if (!jobStats) return null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Thống kê công việc</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Tổng công việc"
            value={jobStats.total}
            icon={<Briefcase className="w-6 h-6" />}
            color="blue"
          />
          
          <StatsCard
            title="Đang mở"
            value={jobStats.published}
            icon={<Briefcase className="w-6 h-6" />}
            subtitle={`${((jobStats.published / jobStats.total) * 100).toFixed(1)}% tổng công việc`}
            color="green"
          />
          
          <StatsCard
            title="Đã đóng"
            value={jobStats.closed}
            icon={<Briefcase className="w-6 h-6" />}
            subtitle={`${((jobStats.closed / jobStats.total) * 100).toFixed(1)}% tổng công việc`}
            color="red"
          />
          
          <StatsCard
            title="Bản nháp"
            value={jobStats.draft}
            icon={<Briefcase className="w-6 h-6" />}
            subtitle={`${((jobStats.draft / jobStats.total) * 100).toFixed(1)}% tổng công việc`}
            color="yellow"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Giá trị trung bình"
          value={formatCurrency(jobStats.averageValue, 'USD')}
          icon={<DollarSign className="w-6 h-6" />}
          subtitle="Ngân sách trung bình mỗi job"
          color="green"
        />
        
        <StatsCard
          title="Tổng giá trị"
          value={formatCurrency(jobStats.totalValue, 'USD')}
          icon={<DollarSign className="w-6 h-6" />}
          subtitle="Tổng ngân sách tất cả job"
          color="blue"
        />
        
        <StatsCard
          title="Tỷ lệ thành công"
          value={`${jobStats.successRate.toFixed(1)}%`}
          icon={<Target className="w-6 h-6" />}
          subtitle="Job có hợp đồng thành công"
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Phân bố theo danh mục"
          subtitle="Top 10 danh mục phổ biến"
        >
          <div className="space-y-3">
            {jobStats.byCategory.slice(0, 10).map((category, index) => (
              <div key={category.categoryName} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500 w-6">
                    #{index + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {category.categoryName}
                  </span>
                </div>
                <span className="text-sm text-gray-600">{category.count}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Phân bố theo chuyên ngành"
          subtitle="Top 10 chuyên ngành phổ biến"
        >
          <div className="space-y-3">
            {jobStats.bySpecialty.slice(0, 10).map((specialty, index) => (
              <div key={specialty.specialtyName} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500 w-6">
                    #{index + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {specialty.specialtyName}
                  </span>
                </div>
                <span className="text-sm text-gray-600">{specialty.count}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}