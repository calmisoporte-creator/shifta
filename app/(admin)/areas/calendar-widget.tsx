'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import type { WorkspaceEvent } from '@/lib/types'

interface Props {
  areaId: string
  userId: string
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const COLORS = [
  { key: 'violet', bg: 'bg-violet-500/20', border: 'border-violet-500/40', dot: 'bg-violet-500', text: 'text-violet-300' },
  { key: 'blue',   bg: 'bg-blue-500/20',   border: 'border-blue-500/40',   dot: 'bg-blue-500',   text: 'text-blue-300' },
  { key: 'green',  bg: 'bg-green-500/20',  border: 'border-green-500/40',  dot: 'bg-green-500',  text: 'text-green-300' },
  { key: 'amber',  bg: 'bg-amber-500/20',  border: 'border-amber-500/40',  dot: 'bg-amber-500',  text: 'text-amber-300' },
  { key: 'red',    bg: 'bg-red-500/20',    border: 'border-red-500/40',    dot: 'bg-red-500',    text: 'text-red-300' },
]

function getColor(key: string) {
  return COLORS.find(c => c.key === key) ?? COLORS[0]
}

export function CalendarWidget({ areaId, userId }: Props) {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const today = new Date()
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [events, setEvents] = useState<WorkspaceEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Modal para crear evento
  const [addModal, setAddModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [form, setForm] = useState({ title: '', description: '', color: 'violet' })
  const [saving, setSaving] = useState(false)

  // Panel de día seleccionado
  const [dayEvents, setDayEvents] = useState<WorkspaceEvent[] | null>(null)
  const [dayLabel, setDayLabel] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const from = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-01`
      const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()
      const to = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const { data } = await supabase
        .from('workspace_events')
        .select('*')
        .eq('area_id', areaId)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true })

      setEvents((data as WorkspaceEvent[]) ?? [])
      setLoading(false)
    }
    load()
  }, [areaId, current])

  // Construir grilla del mes
  const year = current.getFullYear()
  const month = current.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function eventsForDay(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.date === dateStr)
  }

  function openDay(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(dateStr)
    const evs = eventsForDay(day)
    setDayEvents(evs)
    setDayLabel(`${day} de ${MONTHS[month]} ${year}`)
    if (evs.length === 0) {
      setForm({ title: '', description: '', color: 'violet' })
      setAddModal(true)
    }
  }

  function openAddFromDay() {
    setForm({ title: '', description: '', color: 'violet' })
    setAddModal(true)
    setDayEvents(null)
  }

  async function saveEvent() {
    if (!form.title.trim()) return
    setSaving(true)

    const { data } = await supabase
      .from('workspace_events')
      .insert({
        area_id: areaId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        color: form.color,
        date: selectedDate,
        created_by: userId,
      })
      .select()
      .single()

    if (data) {
      setEvents(prev => [...prev, data as WorkspaceEvent].sort((a, b) => a.date.localeCompare(b.date)))
    }

    setSaving(false)
    setAddModal(false)
  }

  async function deleteEvent(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id))
    setDayEvents(prev => prev ? prev.filter(e => e.id !== id) : null)
    await supabase.from('workspace_events').delete().eq('id', id)
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-100">Calendario</h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrent(new Date(year, month - 1, 1))} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-100">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-medium text-gray-300 px-1">{MONTHS[month]} {year}</span>
          <button onClick={() => setCurrent(new Date(year, month + 1, 1))} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-100">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Grilla */}
      <div className="p-3">
        {/* Días de la semana */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>
          ))}
        </div>

        {/* Celdas */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} />
            const evs = eventsForDay(day)
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday = dateStr === todayStr

            return (
              <button
                key={idx}
                onClick={() => openDay(day)}
                className={`relative flex flex-col items-center rounded-md py-1.5 px-0.5 transition-colors hover:bg-gray-800 ${
                  isToday ? 'bg-violet-600/20 ring-1 ring-violet-500/50' : ''
                }`}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-violet-300' : 'text-gray-300'}`}>
                  {day}
                </span>
                {evs.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {evs.slice(0, 3).map(e => (
                      <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${getColor(e.color).dot}`} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Próximos eventos del mes */}
      {events.length > 0 && (
        <div className="border-t border-gray-800 px-3 py-2 space-y-1 max-h-36 overflow-y-auto">
          {events.map(e => {
            const c = getColor(e.color)
            const d = new Date(e.date + 'T00:00:00')
            return (
              <div key={e.id} className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 ${c.bg} ${c.border}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                  <span className={`text-xs font-medium truncate ${c.text}`}>{e.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-500">{d.getDate()} {MONTHS[d.getMonth()].slice(0, 3)}</span>
                  <button onClick={() => deleteEvent(e.id)} className="text-gray-600 hover:text-red-400">
                    <X size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal eventos del día */}
      {dayEvents !== null && (
        <Modal open={true} onClose={() => setDayEvents(null)} title={dayLabel}>
          <div className="space-y-3">
            {dayEvents.map(e => {
              const c = getColor(e.color)
              return (
                <div key={e.id} className={`flex items-start justify-between gap-2 rounded-lg border p-3 ${c.bg} ${c.border}`}>
                  <div>
                    <p className={`text-sm font-medium ${c.text}`}>{e.title}</p>
                    {e.description && <p className="text-xs text-gray-400 mt-0.5">{e.description}</p>}
                  </div>
                  <button onClick={() => deleteEvent(e.id)} className="text-gray-500 hover:text-red-400 flex-shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
            <Button size="sm" onClick={openAddFromDay} className="w-full">
              <Plus size={13} /> Agregar evento
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal crear evento */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title={`Nuevo evento — ${dayLabel}`}>
        <div className="space-y-4">
          <Input
            label="Título"
            placeholder="Ej: Reunión de equipo"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            autoFocus
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">Descripción (opcional)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Detalles del evento..."
              rows={2}
              className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c.key}
                  onClick={() => setForm(p => ({ ...p, color: c.key }))}
                  className={`h-6 w-6 rounded-full ${c.dot} transition-all ${form.color === c.key ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : 'opacity-60 hover:opacity-100'}`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setAddModal(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={saveEvent}>Agregar evento</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
