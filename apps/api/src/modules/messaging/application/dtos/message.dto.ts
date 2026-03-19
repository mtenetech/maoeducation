export interface CreateThreadDto {
  subject: string
  recipientIds: string[]
  body: string // first message body
}

export interface ReplyDto {
  body: string
  recipientIds?: string[] // if empty, reply to all original thread participants
}

export interface ListThreadsQuery {
  unreadOnly?: boolean
}
