import { useMemo, useState } from 'react'
import ChatMessageList from '~/components/chat/ChatMessageList'
import ChatComposer from '~/components/chat/ChatComposer'
import JobChatSidebar from '~/components/chat/JobChatSidebar'
import JobSummaryPanel from '~/components/chat/JobSummaryPanel'
import JobChatHeader from '~/components/chat/JobChatHeader'
import type { ChatAttachment, ChatMessage, JobMilestone, JobThread } from '~/components/chat/types'

const jobThreads: JobThread[] = [
        {
                id: 'thread-1',
                jobTitle: 'Landing page redesign for SaaS dashboard',
                jobCode: 'LB-2048',
                jobCategory: 'UI/UX Design',
                clientName: 'Linh Tran',
                freelancerName: 'Tuấn Nguyễn',
                budget: '$3,200',
                updatedAt: '2024-09-18T14:32:00Z',
                lastMessageSnippet: 'Mockups for onboarding are attached below. Let me know which variant fits best so I can finalize the responsive states.',
                unreadCount: 2,
                status: 'Active contract'
        },
        {
                id: 'thread-2',
                jobTitle: 'Mobile app QA test cycle',
                jobCode: 'QA-1184',
                jobCategory: 'Quality Assurance',
                clientName: 'Hoàng Phạm',
                freelancerName: 'Lan Phương',
                budget: '$1,050',
                updatedAt: '2024-09-17T08:15:00Z',
                lastMessageSnippet: 'Uploading the regression report and test cases spreadsheet for sprint 12.',
                status: 'Active contract'
        },
        {
                id: 'thread-3',
                jobTitle: 'Shopify store audit & optimisation',
                jobCode: 'EC-0911',
                jobCategory: 'E-commerce Development',
                clientName: 'Nam Bùi',
                freelancerName: 'Minh Châu',
                budget: '$750',
                updatedAt: '2024-09-15T10:45:00Z',
                lastMessageSnippet: 'Offer sent with recommended milestones. Waiting for your go-ahead.',
                status: 'Offer sent'
        }
]

const milestonesByThread: Record<string, JobMilestone[]> = {
        'thread-1': [
                {
                        id: 'ms-1',
                        title: 'Research & wireframes',
                        dueDate: '2024-09-20T17:00:00Z',
                        amount: '$900',
                        status: 'completed'
                },
                {
                        id: 'ms-2',
                        title: 'High-fidelity desktop designs',
                        dueDate: '2024-09-27T17:00:00Z',
                        amount: '$1,400',
                        status: 'inReview'
                },
                {
                        id: 'ms-3',
                        title: 'Mobile responsive screens',
                        dueDate: '2024-10-03T17:00:00Z',
                        amount: '$900',
                        status: 'upcoming'
                }
        ],
        'thread-2': [
                {
                        id: 'ms-4',
                        title: 'Smoke test checklist',
                        dueDate: '2024-09-19T09:00:00Z',
                        amount: '$250',
                        status: 'completed'
                },
                {
                        id: 'ms-5',
                        title: 'Regression cycle',
                        dueDate: '2024-09-25T09:00:00Z',
                        amount: '$400',
                        status: 'inReview'
                },
                {
                        id: 'ms-6',
                        title: 'Beta testing report',
                        dueDate: '2024-10-02T09:00:00Z',
                        amount: '$400',
                        status: 'upcoming'
                }
        ],
        'thread-3': [
                {
                        id: 'ms-7',
                        title: 'Analytics audit',
                        dueDate: '2024-09-22T12:00:00Z',
                        amount: '$250',
                        status: 'upcoming'
                },
                {
                        id: 'ms-8',
                        title: 'Speed optimisation fixes',
                        dueDate: '2024-09-29T12:00:00Z',
                        amount: '$300',
                        status: 'upcoming'
                },
                {
                        id: 'ms-9',
                        title: 'Conversion improvements',
                        dueDate: '2024-10-06T12:00:00Z',
                        amount: '$200',
                        status: 'upcoming'
                }
        ]
}

const messagesByThread: Record<string, ChatMessage[]> = {
        'thread-1': [
                {
                        id: 'msg-1',
                        senderRole: 'client',
                        senderName: 'Linh Tran',
                        content: "Morning Tuấn! We loved the hero exploration from last round. Can you also explore how the pricing block handles 3 plans?",
                        sentAt: '2024-09-18T08:15:00Z',
                        status: 'read'
                },
                {
                        id: 'msg-2',
                        senderRole: 'freelancer',
                        senderName: 'Tuấn Nguyễn',
                        content: "Absolutely. I've prepared two alternatives for the pricing section and polished the onboarding walkthrough.",
                        sentAt: '2024-09-18T09:02:00Z',
                        status: 'read',
                        attachments: [
                                {
                                        id: 'att-1',
                                        type: 'image',
                                        name: 'onboarding-step-01.png',
                                        url: 'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=640&q=80',
                                        previewUrl: 'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=640&q=80',
                                        size: '1.2 MB',
                                        uploadedAt: '2024-09-18T09:01:00Z'
                                },
                                {
                                        id: 'att-2',
                                        type: 'image',
                                        name: 'pricing-variant-a.png',
                                        url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=640&q=80',
                                        previewUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=640&q=80',
                                        size: '980 KB',
                                        uploadedAt: '2024-09-18T09:01:30Z'
                                }
                        ]
                },
                {
                        id: 'msg-3',
                        senderRole: 'client',
                        senderName: 'Linh Tran',
                        content: 'Variant A feels closer to what we need. Could you also include a testimonial slider below the plans? We have copy ready.',
                        sentAt: '2024-09-18T11:24:00Z',
                        status: 'delivered'
                },
                {
                        id: 'msg-4',
                        senderRole: 'freelancer',
                        senderName: 'Tuấn Nguyễn',
                        content: 'Sure thing! Sharing the updated layout and a checklist of pending tasks before Friday.',
                        sentAt: '2024-09-18T12:05:00Z',
                        status: 'sent',
                        attachments: [
                                {
                                        id: 'att-3',
                                        type: 'file',
                                        name: 'worklog-week-09.pdf',
                                        url: '#',
                                        size: '340 KB',
                                        uploadedAt: '2024-09-18T12:04:30Z'
                                },
                                {
                                        id: 'att-4',
                                        type: 'file',
                                        name: 'qa-checklist.xlsx',
                                        url: '#',
                                        size: '210 KB',
                                        uploadedAt: '2024-09-18T12:04:45Z'
                                }
                        ]
                }
        ],
        'thread-2': [
                {
                        id: 'msg-5',
                        senderRole: 'client',
                        senderName: 'Hoàng Phạm',
                        content: 'Sprint 12 build is uploaded. Focus this round on push notifications and offline mode.',
                        sentAt: '2024-09-17T06:50:00Z',
                        status: 'read'
                },
                {
                        id: 'msg-6',
                        senderRole: 'freelancer',
                        senderName: 'Lan Phương',
                        content: 'Got it. Smoke tests are done. Uploading the regression deck + annotated sheet for bug priorities.',
                        sentAt: '2024-09-17T07:30:00Z',
                        status: 'read',
                        attachments: [
                                {
                                        id: 'att-5',
                                        type: 'file',
                                        name: 'regression-cycle-12.pdf',
                                        url: '#',
                                        size: '1.8 MB',
                                        uploadedAt: '2024-09-17T07:25:00Z'
                                },
                                {
                                        id: 'att-6',
                                        type: 'file',
                                        name: 'bugs-priority.xlsx',
                                        url: '#',
                                        size: '620 KB',
                                        uploadedAt: '2024-09-17T07:26:00Z'
                                }
                        ]
                }
        ],
        'thread-3': [
                {
                        id: 'msg-7',
                        senderRole: 'freelancer',
                        senderName: 'Minh Châu',
                        content: 'Here is the proposal outlining the audit scope. Let me know if the milestone split aligns with your plan.',
                        sentAt: '2024-09-15T08:10:00Z',
                        status: 'sent',
                        attachments: [
                                {
                                        id: 'att-7',
                                        type: 'file',
                                        name: 'shopify-audit-proposal.pdf',
                                        url: '#',
                                        size: '540 KB',
                                        uploadedAt: '2024-09-15T08:08:00Z'
                                }
                        ]
                }
        ]
}

export default function JobChatPage() {
        const [selectedThreadId, setSelectedThreadId] = useState(jobThreads[0]?.id ?? '')
        const [searchTerm, setSearchTerm] = useState('')

        const filteredThreads = useMemo(() => {
                const term = searchTerm.trim().toLowerCase()
                return jobThreads
                        .filter(thread =>
                                term.length === 0
                                        ? true
                                        : [thread.jobTitle, thread.clientName, thread.freelancerName, thread.jobCode]
                                                      .join(' ')
                                                      .toLowerCase()
                                                      .includes(term)
                        )
                        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        }, [searchTerm])

        const activeThread = useMemo<JobThread | undefined>(() => {
                const prioritisedThreads = filteredThreads.length > 0 ? filteredThreads : jobThreads
                const active = prioritisedThreads.find(thread => thread.id === selectedThreadId)

                if (active) {
                        return active
                }

                const fallback = jobThreads.find(thread => thread.id === selectedThreadId)
                if (fallback) {
                        return fallback
                }

                return prioritisedThreads[0] ?? jobThreads[0]
        }, [filteredThreads, selectedThreadId])

        const messages = useMemo<ChatMessage[]>(() => {
                if (!activeThread) {
                        return []
                }
                return [...(messagesByThread[activeThread.id] ?? [])].sort(
                        (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
                )
        }, [activeThread])

        const sharedAttachments = useMemo<ChatAttachment[]>(() => {
                return messages.flatMap(message => message.attachments ?? [])
        }, [messages])

        const milestones = useMemo<JobMilestone[]>(() => {
                if (!activeThread) {
                        return []
                }
                return milestonesByThread[activeThread.id] ?? []
        }, [activeThread])

        if (!activeThread) {
                return (
                        <div className='rounded-3xl border border-white/60 bg-white/80 p-10 text-center text-slate-500 shadow-[0_20px_60px_rgba(15,23,42,0.08)]'>
                                <p>No job conversations yet. Once you have an active contract, it will appear here.</p>
                        </div>
                )
        }

        return (
                <div className='grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_320px]'>
                        <JobChatSidebar
                                threads={filteredThreads}
                                selectedThreadId={activeThread.id}
                                onSelectThread={setSelectedThreadId}
                                searchTerm={searchTerm}
                                onSearchTermChange={setSearchTerm}
                        />

                        <section className='flex min-h-[720px] flex-col gap-4 rounded-3xl border border-white/60 bg-white/75 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur'>
                                <JobChatHeader thread={activeThread} />
                                <div className='flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-4 shadow-inner shadow-primary/5'>
                                        <ChatMessageList messages={messages} jobTitle={activeThread.jobTitle} />
                                        <ChatComposer />
                                </div>
                        </section>

                        <JobSummaryPanel thread={activeThread} milestones={milestones} attachments={sharedAttachments} />
                </div>
        )
}
