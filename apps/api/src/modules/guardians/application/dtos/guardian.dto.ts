export interface GuardianRelationFlags {
  relationship?: string // padre | madre | tutor_legal | otro
  isPrimary?: boolean
  isLegalRep?: boolean
  livesWithStudent?: boolean
  isEmergencyContact?: boolean
}

export interface CreateGuardianDto extends GuardianRelationFlags {
  // Si se pasa existingGuardianId se vincula un usuario guardian existente;
  // de lo contrario se crea uno nuevo con estos datos.
  existingGuardianId?: string
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  dni?: string
  phone?: string
  phoneAlt?: string
  address?: string
  occupation?: string
}

export interface UpdateGuardianLinkDto extends GuardianRelationFlags {}

export interface GuardianItemDto {
  guardianId: string
  email: string
  fullName: string
  relationship: string
  isPrimary: boolean
  isLegalRep: boolean
  livesWithStudent: boolean
  isEmergencyContact: boolean
  profile: {
    dni: string | null
    phone: string | null
    phoneAlt: string | null
    address: string | null
    occupation: string | null
  } | null
}
