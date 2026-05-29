export interface InstitutionBranding {
  logoUrl?: string | null
  primaryColor?: string | null // HSL string, ej. "221 83% 53%"
  sidebarColor?: string | null // HSL string
}

export interface InstitutionSettingsDto {
  id: string
  name: string
  code: string
  branding: InstitutionBranding
}

export interface UpdateInstitutionSettingsDto {
  name?: string
  branding?: InstitutionBranding
}
