export interface CreateIncidentDto {
  studentId: string
  incidentDate: string // YYYY-MM-DD
  category: string
  description: string
  severity?: 'low' | 'medium' | 'high'
}

export interface UpdateIncidentDto {
  category?: string
  description?: string
  severity?: 'low' | 'medium' | 'high'
  status?: 'open' | 'in_review' | 'resolved' | 'closed'
  resolutionNotes?: string
}

export interface ListIncidentsQuery {
  studentId?: string
  status?: string
  severity?: string
  search?: string
}
