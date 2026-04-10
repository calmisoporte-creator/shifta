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

const DAYS   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const COLORS = [
  { key: 'violet', dot: 'bg-violet-500', ring: 'ring-violet-400', bg: 'bg-violet-500/15 border-violet-500/30', text: 'text-violet-300' },
  { key: 'blue',   dot: 'bg-blue-500',   ring: 'ring-blue-400',   bg: 'bg-blue-500/15 border-blue-500/30',     text: 'text-blue-300' },
  { key: 'green',  dot: 'bg-green-500',  ring: 'ring-green-400',  bg: 'bg-green-500/15 border-green-500/30',   text: 'text-green-300' },
  { key: 'amber',  dot: 'bg-amber-500',  ring: 'ring-amber-400',  bg: 'bg-amber-500/15 border-amber-500/30',   text: 'text-amber-300' },
  { key: 'red',    dot: 'bg-red-500',    ring: 'ring-red-400',    bg: 'bg-red-500/15 border-red-500/30',       text: 'text-red-300' },
]

function getColor(key: string) {
  return COLORS.find(c => c.key === key) ?? COLORS[0]
}

const EMPTY_FORM = { title: '', description: '', color: 'violet' }

export function CalendarWidget({ areaId, userId }: Props) {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const today = new Date()
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [events, setEvents] = useState<WorkspaceEvent[]>([])

  // Modal: qué día está abierto
  const [openDay, setOpenDay] = useState<{ day: number; dateStr: string; label: string } | null>(null)
  // Formulario dentro del modal del día
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const year  = current.getFullYear()
  const month = current.getMonth()

  // Cargar eventos del mes visible
  useEffect(() => {
    async function load() {
      const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const { data } = await supabase
        .from('workspace_events')
        .select('*')
        .eq('area_id', areaId)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true })

      setEvents((data as WorkspaceEvent[]) ?? [])
    }
    load()
  }, [areaId, year, month])

  // Grilla del mes
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function getEventsForDay(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.date === dateStr)
  }

  function handleDayClick(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const label   = `${day} de ${MONTHS[month]} ${year}`
    setOpenDay({ day, dateStr, label })
    setShowForm(false)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  function closeModal() {
    setOpenDay(null)
    setShowForm(false)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  async function saveEvent() {
    if (!form.title.trim()) { setFormError('Escribí un título para el evento'); return }
    setSaving(true)
    setFormError('')

    const { data, error } = await supabase
      .from('workspace_events')
      .insert({
        area_id:     areaId,
        title:       form.title.trim(),
        description: form.description.trim() || null,
        color:       form.color,
        date:        openDay!.dateStr,
        created_by:  userId,
      })
      .select()
      .single()

    setSaving(false)

    if (error) {
      setFormError(`Error: ${error.message}`)
      return
    }

    if (data) {
      setEvents(prev => [...prev, data as WorkspaceEvent].sort((a, b) => a.date.localeCompare(b.date)))
      setForm(EMPTY_FORM)
      setShowForm(false)
    }
  }

  async function deleteEvent(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id))
    await supabase.from('workspace_events').delete().eq('id', id)
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Eventos del día abierto (los leemos en tiempo real de `events` para que se actualicen)
  const dayEvents = openDay ? events.filter(e => e.date === openDay.dateStr) : []

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-100">Calendario</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrent(new Date(year, month - 1, 1))}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-100"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-medium text-gray-300 px-2 w-36 text-center">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={() => setCurrent(new Date(year, month + 1, 1))}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-100"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Grilla */}
      <div className="p-3">
        {/* Encabezados días */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>
          ))}
        </div>

        {/* Celdas */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} />

            const evs     = getEventsForDay(day)
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday = dateStr === todayStr

            return (
              <button
                key={idx}
                onClick={() => handleDayClick(day)}
                className={`relative flex flex-col items-center rounded-lg py-1.5 transition-colors hover:bg-gray-800 ${
                  isToday ? 'bg-violet-600/20 ring-1 ring-inset ring-violet-500/40' : ''
                }`}
              >
                <span className={`text-xs font-medium leading-none ${isToday ? 'text-violet-300' : 'text-gray-300'}`}>
                  {day}
                </span>
                {/* Puntos de eventos */}
                {evs.length > 0 && (
                  <div className="flex gap-0.5 mt-1 justify-center flex-wrap">
                    {evs.slice(0, 3).map(e => (
                      <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${getColor(e.color).dot}`} />
                    ))}
                    {evs.length > 3 && <span className="text-[9px] text-gray-500">+{evs.length - 3}</span>}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mini lista de próximos eventos */}
      {events.length > 0 && (
        <div className="border-t border-gray-800 px-3 py-2 space-y-1 max-h-32 overflow-y-auto">
          {events.map(e => {
            const c = getColor(e.color)
            const d = new Date(e.date + 'T12:00:00')
            return (
              <div key={e.id} className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 ${c.bg}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                  <span className={`text-xs font-medium truncate ${c.text}`}>{e.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-500">
                    {d.getDate()} {MONTHS[d.getMonth()].slice(0, 3)}
                  </span>
                  <button
                    onClick={() => deleteEvent(e.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal del día ── */}
      {openDay && (
        <Modal open={true} onClose={closeModal} title={openDay.label}>
          <div className="space-y-4">
            {/* Eventos existentes del día */}
            {dayEvents.length === 0 && !showForm && (
              <p className="text-sm text-gray-500 text-center py-3">
                No hay eventos para este día.
              </p>
            )}

            {dayEvents.length > 0 && (
              <div className="space-y-2">
                {dayEvents.map(e => {
                  const c = getColor(e.color)
                  return (
                    <div key={e.id} className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${c.bg}`}>
                      <div className="flex items-start gap-2 min-w-0">
                        <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${c.dot}`} />
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${c.text}`}>{e.title}</p>
                          {e.description && (
                            <p className="text-xs text-gray-400 mt-0.5">{e.description}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteEvent(e.id)}
                        className="text-gray-500 hover:text-red-400 flex-shrink-0 mt-0.5"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Formulario de nuevo evento (inline) */}
            {showForm && (
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Nuevo evento</p>
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
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>
                {/* Selector de color */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-300">Color</label>
                  <div className="flex gap-2">
                    {COLORS.map(c => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, color: c.key }))}
                        className={`h-6 w-6 rounded-full ${c.dot} transition-all ${
                          form.color === c.key
                            ? `ring-2 ${c.ring} ring-offset-2 ring-offset-gray-800 scale-110`
                            : 'opacity-50 hover:opacity-80'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {formError && (
                  <p className="text-xs text-red-400">{formError}</p>
                )}
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError('') }}>
                    Cancelar
                  </Button>
                  <Button size="sm" loading={saving} onClick={saveEvent}>
                    Guardar evento
                  </Button>
                </div>
              </div>
            )}

            {/* Botón agregar */}
            {!showForm && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => { setForm(EMPTY_FORM); setFormError(''); setShowForm(true) }}
              >
                <Plus size={14} /> Agregar evento
              </Button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
