import { apiClient } from '@/shared/lib/api-client'

export interface PersonalRegisterDto {
  firstName: string
  lastName: string
  email: string
  password: string
  workspaceName?: string
}

export interface PersonalSetupDto {
  profile: 'subject-first' | 'classroom-first'
  yearName: string
  yearStart: string
  yearEnd: string
  workspaceName?: string
  subjectName?: string
  groups?: Array<{ name: string }>
  parallelName?: string
  subjectNames?: string[]
}

export interface BulkCreateStudentsDto {
  students: Array<{
    firstName: string
    lastName: string
    dni: string
    birthDate?: string
  }>
  parallelId: string
  academicYearId: string
}

export const personalApi = {
  register: (dto: PersonalRegisterDto) =>
    apiClient.post('personal/register', { json: dto }).json<{ accessToken: string; user: unknown }>(),

  login: (dto: { email: string; password: string }) =>
    apiClient.post('personal/login', { json: dto }).json<{ accessToken: string; user: unknown }>(),

  setup: (dto: PersonalSetupDto) =>
    apiClient.post('personal/setup', { json: dto }).json<{
      yearId: string
      parallelIds: string[]
      subjectIds: string[]
      assignmentIds: string[]
    }>(),

  bulkCreateStudents: (dto: BulkCreateStudentsDto) =>
    apiClient.post('enrollments/students/bulk', { json: dto }).json<{
      created: number
      skipped: number
      results: Array<{ firstName: string; lastName: string; dni: string; status: string; reason?: string }>
    }>(),
}
