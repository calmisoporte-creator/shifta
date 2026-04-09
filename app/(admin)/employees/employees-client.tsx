'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Users, UserCheck, UserX, RefreshCw } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface Employee {
  id: string
  name: string
  is_active: boolean
  created_at: string
  user_areas: Array<{
    area_id: string
    work_areas: { name: string } | null
  }>
}

interface Area {
  id: string
  name: string
  access_type: string
}

interface Props {
  employees: Employee[]
  areas: Area[]
}

export function EmployeesClient({ employees: initial, areas }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [employees, setEmployees] = useState(initial)
  const [reassignModal, setReassignModal] = useState(false)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [newAreaId, setNewAreaId] = useState('')
  const [saving, setSaving] = useState(false)

  const activeAreas = areas.filter(a => a.access_type === 'employees')

  async function toggleActive(emp: Employee) {
    const { data } = await supabase
      .from('profiles')
      .update({ is_active: !emp.is_active })
      .eq('id', emp.id)
      .select()
      .single()
    if (data) setEmployees(prev => prev.map(e => e.id === data.id ? { ...e, is_active: data.is_active } : e))
  }

  function openReassign(emp: Employee) {
    setSelected(emp)
    setNewAreaId(emp.user_areas[0]?.area_id ?? '')
    setReassignModal(true)
  }

  async function reassign() {
    if (!selected || !newAreaId) return
    setSaving(true)

    await supabase.from('user_areas').delete().eq('user_id', selected.id)
    await supabase.from('user_areas').insert({ user_id: selected.id, area_id: newAreaId })

    const area = areas.find(a => a.id === newAreaId)
    setEmployees(prev => prev.map(e =>
      e.id === selected.id
        ? { ...e, user_areas: [{ area_id: newAreaId, work_areas: area ? { name: area.name } : null }] }
        : e
    ))
    setSaving(false)
    setReassignModal(false)
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Empleados</h1>
          <p className="text-sm text-gray-400 mt-1">{employees.length} empleado{employees.length !== 1 ? 's' : ''} registrado{employees.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {employees.length === 0 ? (
        <Card className="text-center py-12">
          <Users size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No hay empleados registrados</p>
          <p className="text-sm text-gray-500 mt-1">Compartí el link de invitación para que se unan.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {employees.map(emp => {
            const areaName = emp.user_areas[0]?.work_areas?.name
            return (
              <div
                key={emp.id}
                className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 px-5 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-300 font-semibold text-sm flex-shrink-0">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-100">{emp.name}</p>
                      {!emp.is_active && <Badge variant="danger">Inactivo</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Área: {areaName ? (
                        <span className="text-violet-400">{areaName}</span>
                      ) : (
                        <span className="text-gray-600">Sin asignar</span>
                      )}
                      {' · '}Ingresó {formatDate(emp.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openReassign(emp)}
                    title="Reasignar área"
                  >
                    <RefreshCw size={13} />
                    Reasignar
                  </Button>
                  <button
                    onClick={() => toggleActive(emp)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      emp.is_active
                        ? 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        : 'border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                    }`}
                  >
                    {emp.is_active ? <><UserX size={13} /> Desactivar</> : <><UserCheck size={13} /> Activar</>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={reassignModal} onClose={() => setReassignModal(false)} title="Reasignar área">
        <p className="text-sm text-gray-400 mb-4">
          Reasignando a <strong className="text-gray-100">{selected?.name}</strong>
        </p>
        <Select
          label="Nueva área"
          value={newAreaId}
          onChange={e => setNewAreaId(e.target.value)}
        >
          <option value="">Seleccioná un área</option>
          {activeAreas.map(area => (
            <option key={area.id} value={area.id}>{area.name}</option>
          ))}
        </Select>
        <div className="flex gap-3 mt-5">
          <Button variant="secondary" className="flex-1" onClick={() => setReassignModal(false)}>Cancelar</Button>
          <Button className="flex-1" loading={saving} onClick={reassign} disabled={!newAreaId}>
            Guardar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
