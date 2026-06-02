import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select'
import { PageLoader } from '@/shared/components/feedback/loading-spinner'
import { getErrorMessage } from '@/shared/lib/utils'
import type { DynamicField, DynamicSchema } from '@/shared/components/form/DynamicForm'
import { listAnamnesisTemplates, updateAnamnesisTemplate } from '../api/students.api'

const FIELD_TYPES: DynamicField['type'][] = ['text', 'textarea', 'select', 'checkbox', 'date']

function slug(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 40)
}

export function AnamnesisTemplatePage() {
  const qc = useQueryClient()
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['anamnesis-templates'],
    queryFn: listAnamnesisTemplates,
  })
  const template = templates.find((t) => t.isDefault) ?? templates[0]
  const [schema, setSchema] = useState<DynamicSchema>({ sections: [] })

  useEffect(() => {
    if (template) setSchema(template.schema ?? { sections: [] })
  }, [template])

  const mSave = useMutation({
    mutationFn: () => updateAnamnesisTemplate(template!.id, { schema }),
    onSuccess: () => { toast.success('Plantilla guardada'); qc.invalidateQueries({ queryKey: ['anamnesis-templates'] }) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  if (isLoading) return <PageLoader />
  if (!template) return <p className="p-6 text-sm text-muted-foreground">No hay plantilla configurada.</p>

  const updateSection = (i: number, patch: Partial<DynamicSchema['sections'][number]>) =>
    setSchema((s) => ({ sections: s.sections.map((sec, idx) => (idx === i ? { ...sec, ...patch } : sec)) }))
  const removeSection = (i: number) =>
    setSchema((s) => ({ sections: s.sections.filter((_, idx) => idx !== i) }))
  const addSection = () =>
    setSchema((s) => ({ sections: [...s.sections, { title: 'Nueva sección', fields: [] }] }))

  const updateField = (si: number, fi: number, patch: Partial<DynamicField>) =>
    updateSection(si, {
      fields: schema.sections[si].fields.map((f, idx) => (idx === fi ? { ...f, ...patch } : f)),
    })
  const removeField = (si: number, fi: number) =>
    updateSection(si, { fields: schema.sections[si].fields.filter((_, idx) => idx !== fi) })
  const addField = (si: number) =>
    updateSection(si, {
      fields: [...schema.sections[si].fields, { key: `campo_${Date.now()}`, label: 'Nuevo campo', type: 'text' }],
    })

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plantilla de anamnesis</h1>
          <p className="text-sm text-muted-foreground">Configura las secciones y campos de la ficha</p>
        </div>
        <Button onClick={() => mSave.mutate()} loading={mSave.isPending}>Guardar plantilla</Button>
      </div>

      <div className="space-y-4">
        {schema.sections.map((section, si) => (
          <Card key={si}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Input
                  value={section.title}
                  onChange={(e) => updateSection(si, { title: e.target.value })}
                  className="max-w-sm font-semibold"
                />
                <Button variant="ghost" size="sm" onClick={() => removeSection(si)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {section.fields.map((f, fi) => (
                <div key={fi} className="flex flex-wrap items-end gap-2 rounded-md border p-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Etiqueta</Label>
                    <Input
                      value={f.label}
                      onChange={(e) => updateField(si, fi, { label: e.target.value, key: f.key || slug(e.target.value) })}
                      className="w-full sm:w-48"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={f.type} onValueChange={(v) => updateField(si, fi, { type: v as DynamicField['type'] })}>
                      <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {f.type === 'select' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Opciones (coma)</Label>
                      <Input
                        value={(f.options ?? []).join(', ')}
                        onChange={(e) => updateField(si, fi, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })}
                        className="w-48"
                      />
                    </div>
                  )}
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" className="h-4 w-4" checked={!!f.required} onChange={(e) => updateField(si, fi, { required: e.target.checked })} />
                    Requerido
                  </label>
                  <Button variant="ghost" size="sm" onClick={() => removeField(si, fi)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addField(si)}>
                <Plus className="mr-1.5 h-4 w-4" /> Agregar campo
              </Button>
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" onClick={addSection}>
          <Plus className="mr-2 h-4 w-4" /> Agregar sección
        </Button>
      </div>
    </div>
  )
}
