export interface CreateLeadDto {
  name: string
  email: string
  phone?: string
  institutionName?: string
  city?: string
  role?: string
  studentsCount?: number
  message?: string
  source?: string
}
