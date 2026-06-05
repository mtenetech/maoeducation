export interface CreateParentMeetingDto {
  studentId?: string | null
  meetingDate: string // YYYY-MM-DD
  meetingTime?: string // "HH:mm"
  visitorName: string
  visitorRelation?: string
  subject: string
  details: string
  agreements?: string
}

export interface UpdateParentMeetingDto {
  studentId?: string | null
  meetingDate?: string
  meetingTime?: string
  visitorName?: string
  visitorRelation?: string
  subject?: string
  details?: string
  agreements?: string
}

export interface ListParentMeetingsQuery {
  studentId?: string
  from?: string // YYYY-MM-DD
  to?: string // YYYY-MM-DD
}

export interface SaveSignatureDto {
  /** Imagen PNG de la firma como data URL: "data:image/png;base64,...." */
  signature: string
}
