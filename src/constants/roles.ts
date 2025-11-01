import { Role } from '~/types/user'

export const ROLE_LABELS: Record<Role, string> = {
        [Role.ADMIN]: 'Quản trị viên',
        [Role.ARBITRATOR]: 'Trọng tài',
        [Role.CLIENT]: 'Khách hàng',
        [Role.FREELANCER]: 'Freelancer'
}
