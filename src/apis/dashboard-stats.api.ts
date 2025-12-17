import authorizeAxiosInstance from '~/utils/authorizeAxios'

export interface UserStats {
  total: number
  clients: number
  freelancers: number
  admins: number
  newThisMonth: number
  activeUsers: number
  growthRate: number
}

export interface JobStats {
  total: number
  published: number
  closed: number
  draft: number
  averageValue: number
  totalValue: number
  byCategory: Array<{ categoryName: string; count: number }>
  bySpecialty: Array<{ specialtyName: string; count: number }>
  successRate: number
}

export interface ContractStats {
  total: number
  active: number
  completed: number
  cancelled: number
  successRate: number
  averageDuration: number
  totalValue: number
  averageValue: number
}

export interface FinancialStats {
  totalRevenue: number
  monthlyRevenue: number
  escrowAmount: number
  releasedAmount: number
  refundedAmount: number
  platformFees: number
  revenueByMonth: Array<{ month: string; revenue: number }>
}

export interface DisputeStats {
  total: number
  open: number
  resolved: number
  mediation: number
  arbitration: number
  resolutionRate: number
  averageResolutionTime: number
  resolutionsByType: Array<{ type: string; count: number }>
}

export interface QualityStats {
  averageRating: number
  totalFeedbacks: number
  positiveRate: number
  repeatClientRate: number
  completionRate: number
  onTimeRate: number
}

export interface TrendStats {
  userGrowth: Array<{ month: string; count: number }>
  jobGrowth: Array<{ month: string; count: number }>
  revenueGrowth: Array<{ month: string; revenue: number }>
  popularSkills: Array<{ skillName: string; demand: number; growth: number }>
  marketDemand: Array<{ specialtyName: string; jobs: number; avgBudget: number }>
  pricetrends: Array<{ month: string; avgPrice: number; jobCount: number }>
}

export interface DashboardOverview {
  users: UserStats
  jobs: JobStats
  contracts: ContractStats
  financial: FinancialStats
  disputes: DisputeStats
  quality: QualityStats
  trends: TrendStats
}

/**
 * Get complete dashboard overview
 */
export const getDashboardOverview = async (): Promise<DashboardOverview> => {
  const response = await authorizeAxiosInstance.get('/dashboard-stats/overview')
  return response.data.data
}

/**
 * Get user statistics
 */
export const getUserStats = async (): Promise<UserStats> => {
  const response = await authorizeAxiosInstance.get('/dashboard-stats/users')
  return response.data.data
}

/**
 * Get job statistics
 */
export const getJobStats = async (): Promise<JobStats> => {
  const response = await authorizeAxiosInstance.get('/dashboard-stats/jobs')
  return response.data.data
}

/**
 * Get contract statistics
 */
export const getContractStats = async (): Promise<ContractStats> => {
  const response = await authorizeAxiosInstance.get('/dashboard-stats/contracts')
  return response.data.data
}

/**
 * Get financial statistics
 */
export const getFinancialStats = async (): Promise<FinancialStats> => {
  const response = await authorizeAxiosInstance.get('/dashboard-stats/financial')
  return response.data.data
}

/**
 * Get dispute statistics
 */
export const getDisputeStats = async (): Promise<DisputeStats> => {
  const response = await authorizeAxiosInstance.get('/dashboard-stats/disputes')
  return response.data.data
}

/**
 * Get quality statistics
 */
export const getQualityStats = async (): Promise<QualityStats> => {
  const response = await authorizeAxiosInstance.get('/dashboard-stats/quality')
  return response.data.data
}

/**
 * Get trend statistics
 */
export const getTrendStats = async (): Promise<TrendStats> => {
  const response = await authorizeAxiosInstance.get('/dashboard-stats/trends')
  return response.data.data
}

// Export all API functions
const dashboardStatsApi = {
  getDashboardOverview,
  getUserStats,
  getJobStats,
  getContractStats,
  getFinancialStats,
  getDisputeStats,
  getQualityStats,
  getTrendStats
}

export default dashboardStatsApi