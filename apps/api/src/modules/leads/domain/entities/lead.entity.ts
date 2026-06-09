export interface Lead {
  id: string
  name: string
  email: string
  phone: string | null
  institutionName: string | null
  city: string | null
  role: string | null
  studentsCount: number | null
  message: string | null
  source: string
  status: string
  createdAt: Date
}
