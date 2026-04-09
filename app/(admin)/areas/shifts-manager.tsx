'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import type { WorkArea, Shift } from '@/lib/types'
import { Plus, Edit2, Trash2, Clock } from 'lucide-react'
import { formatTime } from '@/lib/utils'

interface Props {
  area: WorkArea
  shifts: Shift[]
  onShiftsChange: (shifts: Shift[]) => void
}

export function ShiftsManager({ area, shifts, onShiftsChange }: Props) {
  const supabase = createClient()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Shift | null>(null)
  const [form, setForm] = useState({ name: '', start_time: '' })
  const [saving, setSaving] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState<Shift | null>(null)

  function openCreate() {
    setEditing(null)
    setForm({ name: '', start_time: '' })
    setModal(true)
  }

  function openEdit(shift: Shift) {
    setEditing(shift)
    setForm({ name: shift.name, start_time: shift.start_time })
    setModal(true)
  }

  async function save() {
    if (!form.name.trim() || !form.start_time) return
    setSaving(true)

    if (editing) {
      const { data } = await supabase
        .from('shifts')
        .update({ name: form.name.trim(), start_time: form.start_time })
        .eq('id', editing.id)
        .select()
        .single()
      if (data) onShiftsChange(shifts.map(s => s.id === data.id ? data : s))
    } else {
      const { data } = await supabase
        .from('shifts')
        .insert({ name: form.name.trim(), start_time: form.start_time, area_id: area.id })
        .select()
        .single()
      if (data) onShiftsChange([...shifts, data])
    }

    setSaving(false)
    setModal(false)
  }

  async function deleteShift() {
    if (!deleting) return
    setSaving(true)
    await supabase.from('shifts').delete().eq('id', deleting.id)
    onShiftsChange(shifts.filter(s => s.id !== deleting.id))
    setSaving(false)
    setDeleteModal(false)
    setDeleting(null)
  }

  const sortedShifts = [...shifts].sort((a, b) => a.start_time.localeCompare(b.start_time))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{shifts.length} turno{shifts.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} />
          Agregar turno
        </Button>
      </div>

      <div className="space-y-2">
        {sortedShifts.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6 rounded-lg border border-dashed border-gray-700">
            Sin turnos. Los empleados verán todas las tareas del día.
          </p>
        )}
        {sortedShifts.map(shift => (
          <div
            key={shift.id}
            className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800">
                <Clock size={14} className="text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-100">{shift.name}</p>
                <p className="text-xs text-gray-400">Inicia a las {formatTime(shift.start_time)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openEdit(shift)}
                className="p-1.5 rounded text-gray-500 hover:text-gray-100 hover:bg-gray-700"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => { setDeleting(shift); setDeleteModal(true) }}
                className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar turno' : 'Nuevo turno'}>
        <div className="space-y-4">
          <Input
            label="Nombre del turno"
            placeholder="Ej: Turno tarde"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          />
          <Input
            type="time"
            label="Hora de inicio"
            value={form.start_time}
            onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={save}>
              {editing ? 'Guardar' : 'Agregar turno'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Eliminar turno">
        <p className="text-sm text-gray-300 mb-5">
          ¿Eliminar el turno <strong>{deleting?.name}</strong>?
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteModal(false)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={saving} onClick={deleteShift}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}
