'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Clock } from 'lucide-react'

interface TimeRange {
  start_time: string
  end_time: string
}

export interface EmployeeShift {
  id: string
  user_id: string
  area_id: string
  date: string
  start_time: string
  end_time: string
}

interface Props {
  open: boolean
  onClose: () => void
  userId: string
  areaId: string
  today: string
  existingShifts: EmployeeShift[]
  onSaved: (shifts: EmployeeShift[]) => void
}

export function ScheduleModal({ open, onClose, userId, areaId, today, existingShifts, onSaved }: Props) {
  const supabase = createClient()

  const [ranges, setRanges] = useState<TimeRange[]>(() =>
    existingShifts.length > 0
      ? existingShifts.map(s => ({
          start_time: s.start_time.slice(0, 5),
          end_time: s.end_time.slice(0, 5),
        }))
      : [{ start_time: '', end_time: '' }]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addRange() {
    setRanges(prev => [...prev, { start_time: '', end_time: '' }])
  }

  function removeRange(idx: number) {
    setRanges(prev => prev.filter((_, i) => i !== idx))
  }

  function updateRange(idx: number, field: 'start_time' | 'end_time', value: string) {
    setRanges(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  async function save() {
    setError('')

    for (const r of ranges) {
      if (!r.start_time || !r.end_time) {
        setError('Completá todos los horarios')
        return
      }
      if (r.start_time >= r.end_time) {
        setError('El horario de fin debe ser mayor al de inicio')
        return
      }
    }

    setSaving(true)

    // Borra los turnos del día y guarda los nuevos
    await supabase
      .from('employee_shifts')
      .delete()
      .eq('user_id', userId)
      .eq('area_id', areaId)
      .eq('date', today)

    const { data } = await supabase
      .from('employee_shifts')
      .insert(ranges.map(r => ({
        user_id: userId,
        area_id: areaId,
        date: today,
        start_time: r.start_time,
        end_time: r.end_time,
      })))
      .select()

    setSaving(false)

    if (data) onSaved(data as EmployeeShift[])
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="¿En qué horario trabajás hoy?">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Agregá los rangos de horario que vas a trabajar hoy. Podés agregar varios si tenés un descanso en el medio.
        </p>

        <div className="space-y-3">
          {ranges.map((range, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Clock size={14} className="text-violet-400 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="time"
                  value={range.start_time}
                  onChange={e => updateRange(idx, 'start_time', e.target.value)}
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <span className="text-gray-500 text-sm flex-shrink-0">hasta</span>
                <input
                  type="time"
                  value={range.end_time}
                  onChange={e => updateRange(idx, 'end_time', e.target.value)}
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              {ranges.length > 1 && (
                <button
                  onClick={() => removeRange(idx)}
                  className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addRange}
          className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          <Plus size={14} />
          Agregar otro rango horario
        </button>

        {error && (
          <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Ahora no
          </Button>
          <Button className="flex-1" loading={saving} onClick={save}>
            Confirmar horario
          </Button>
        </div>
      </div>
    </Modal>
  )
}
