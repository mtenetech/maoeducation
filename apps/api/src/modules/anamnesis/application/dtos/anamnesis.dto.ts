export interface AnamnesisField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date'
  required?: boolean
  options?: string[]
}

export interface AnamnesisSection {
  title: string
  fields: AnamnesisField[]
}

export interface AnamnesisSchema {
  sections: AnamnesisSection[]
}

export interface CreateTemplateDto {
  name: string
  schema: AnamnesisSchema
}

export interface UpdateTemplateDto {
  name?: string
  schema?: AnamnesisSchema
  isDefault?: boolean
}

export interface SaveAnamnesisDto {
  templateId?: string
  answers: Record<string, unknown>
}
