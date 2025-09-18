import { ShieldCheck, User, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Role } from '~/types'
import { WizardStepHeader } from './WizardLayout'

const ROLE_OPTIONS: Array<{
  key: Role
  title: string
  description: string
  icon: ReactNode
}> = [
  {
    key: Role.client,
    title: 'Tôi cần thuê freelancer',
    description: 'Đăng tin tuyển dụng và quản lý các dự án của bạn. Bạn có thể hoàn thiện hồ sơ sau.',
    icon: <Users className='size-6' />,
  },
  {
    key: Role.freelancer,
    title: 'Tôi muốn nhận dự án',
    description: 'Tạo hồ sơ nổi bật để tiếp cận nhiều cơ hội công việc chất lượng.',
    icon: <User className='size-6' />,
  },
]

export function RoleStep({
  value,
  onChange,
}: {
  value: Role | undefined
  onChange: (_role: Role) => void
}) {
  return (
    <div>
      <WizardStepHeader
        title='Chào mừng bạn! Hãy cho chúng tôi biết vai trò của bạn.'
        subtitle='Bạn có thể thay đổi bất cứ lúc nào trong phần cài đặt tài khoản.'
        icon={<ShieldCheck className='size-4' />}
      />
      <div className='grid gap-4 md:grid-cols-2'>
        {ROLE_OPTIONS.map(option => {
          const selected = value === option.key
          return (
            <button
              key={option.key}
              type='button'
              onClick={() => onChange(option.key)}
              className={`rounded-2xl border p-5 text-left transition-all ${
                selected
                  ? 'border-primary bg-primary/10 text-primary shadow-lg'
                  : 'border-base-200 hover:-translate-y-0.5 hover:shadow-md'
              }`}
            >
              <div className='flex items-center gap-3'>
                <span className='inline-flex items-center justify-center rounded-full bg-base-200 p-3 text-primary'>
                  {option.icon}
                </span>
                <div>
                  <p className='font-semibold'>{option.title}</p>
                  <p className='text-sm text-base-content/70'>{option.description}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
