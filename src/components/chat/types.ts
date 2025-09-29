export type ParticipantRole = 'client' | 'freelancer'

export type ChatAttachment = {
        id: string
        type: 'image' | 'file'
        name: string
        url: string
        size: string
        uploadedAt: string
        previewUrl?: string
        extension?: string
}

export type ChatMessage = {
        id: string
        senderRole: ParticipantRole
        senderName: string
        senderAvatar?: string
        content?: string
        sentAt: string
        status: 'sent' | 'delivered' | 'read'
        attachments?: ChatAttachment[]
}

export type JobMilestone = {
        id: string
        title: string
        dueDate: string
        amount: string
        status: 'completed' | 'inReview' | 'upcoming'
}

export type JobThread = {
        id: string
        jobTitle: string
        jobCode: string
        jobCategory: string
        clientName: string
        freelancerName: string
        budget: string
        updatedAt: string
        lastMessageSnippet: string
        unreadCount?: number
        status: 'Active contract' | 'Offer sent' | 'Awaiting start'
}
