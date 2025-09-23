import { AlertCircle, ClipboardList, FolderMinus, ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'

const SectionTitle = ({ title }: { title: string }) => (
        <h2 className='text-xl font-semibold text-slate-900'>{title}</h2>
)

const Paragraph = ({ children }: { children: ReactNode }) => (
        <p className='text-sm leading-relaxed text-slate-600'>{children}</p>
)

const List = ({ items }: { items: string[] }) => (
        <ul className='ml-5 list-disc space-y-2 text-sm leading-relaxed text-slate-600'>
                {items.map(item => (
                        <li key={item}>{item}</li>
                ))}
        </ul>
)

const Callout = ({
        icon,
        title,
        description
}: {
        icon: ReactNode
        title: string
        description: string
}) => (
        <div className='flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-sm leading-relaxed text-amber-700'>
                <span className='mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600'>
                        {icon}
                </span>
                <div className='space-y-1'>
                        <p className='font-semibold'>{title}</p>
                        <p>{description}</p>
                </div>
        </div>
)

const ConnectAccountPolicyPage = () => {
        return (
                <article className='space-y-8'>
                        <header className='space-y-3'>
                                <h1 className='text-2xl font-semibold text-slate-900'>Stripe Connect account policy</h1>
                                <Paragraph>
                                        Freelancers must maintain a verified Stripe Connect account to receive payouts from the
                                        marketplace. Follow this policy to stay compliant with financial regulations and protect
                                        your earnings.
                                </Paragraph>
                        </header>

                        <section className='space-y-3'>
                                <SectionTitle title='Eligibility &amp; onboarding' />
                                <Paragraph>
                                        Stripe performs the identity checks required by global Know Your Customer (KYC) laws. To
                                        activate payouts, freelancers must provide accurate information during onboarding:
                                </Paragraph>
                                <List
                                        items={[
                                                'Legal name, date of birth, and residential address that match government-issued documents',
                                                'A bank account that can receive transfers in the country Stripe supports for your profile',
                                                'Any supplemental documents requested by Stripe, such as proof of address or business registration'
                                        ]}
                                />
                                <Paragraph>
                                        You can return to the onboarding flow at any time from the Get Paid page. Stripe locks
                                        the country selection once the account is created, so double-check your choice before
                                        proceeding.
                                </Paragraph>
                        </section>

                        <section className='space-y-3'>
                                <SectionTitle title='Managing your payouts' />
                                <Paragraph>
                                        Stripe may temporarily pause payouts if information is missing, expired, or under review.
                                        Our dashboard highlights any requirements coming directly from Stripe so you can resolve
                                        them quickly.
                                </Paragraph>
                                <Callout
                                        icon={<AlertCircle className='h-4 w-4' />}
                                        title='Keep your details current'
                                        description='Update your banking and identity documents whenever Stripe requests changes. Incorrect information can delay payments.'
                                />
                        </section>

                        <section className='space-y-3'>
                                <SectionTitle title='Closing your Stripe Connect account' />
                                <Paragraph>
                                        Freelancers may request to disconnect their Stripe Connect account from our platform. When
                                        you submit a deletion request from the Get Paid page, we ask Stripe to close the connected
                                        account on your behalf.
                                </Paragraph>
                                <List
                                        items={[
                                                'Stripe automatically blocks the closure if funds are still available, payouts are pending, disputes exist, or other obligations must be resolved',
                                                'We immediately remove the local record of your account only after Stripe confirms the account is eligible for closure',
                                                'If Stripe rejects the request, you will see an error message explaining that the account cannot be deleted yet'
                                        ]}
                                />
                                <Callout
                                        icon={<ShieldAlert className='h-4 w-4' />}
                                        title='Why a request might fail'
                                        description='The most common reason is a remaining balance. Transfer or refund all funds, resolve disputes, and ensure no payouts are in transit before retrying.'
                                />
                                <Paragraph>
                                        Need to check your status ahead of time? Use your Stripe dashboard to review balances and
                                        payouts, or contact Stripe Support for a detailed explanation of any blocking issues.
                                </Paragraph>
                        </section>

                        <section className='space-y-3'>
                                <SectionTitle title='Best practices' />
                                <List
                                        items={[
                                                'Download payout and tax reports from Stripe before closing the account',
                                                'Notify active clients if payouts will be paused while you re-onboard',
                                                'Reach out to our support team if you need to reopen or recreate your Stripe Connect account'
                                        ]}
                                />
                                <div className='grid gap-3 md:grid-cols-2'>
                                        <Callout
                                                icon={<ClipboardList className='h-4 w-4' />}
                                                title='Plan ahead for compliance'
                                                description='Maintaining clear records helps Stripe verify your identity faster when information needs to be revalidated.'
                                        />
                                        <Callout
                                                icon={<FolderMinus className='h-4 w-4' />}
                                                title='Understand the impact of closing'
                                                description='Once deleted, you must complete onboarding again to receive new payouts. Schedule the closure when no payments are due.'
                                        />
                                </div>
                        </section>
                </article>
        )
}

export default ConnectAccountPolicyPage
