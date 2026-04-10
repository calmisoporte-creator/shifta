'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import type { WorkArea, Task } from '@/lib/types'
import { Plus, Edit2, Trash2, GripVertical, Flag, CheckCircle2, Clock, Circle } from 'lucide-react'
import { priorityLabel, priorityColor } from '@/lib/utils'

interface Props {
  area: WorkArea
  tasks: Task[]
  onTasksChange: (tasks: Task[]) => void
}

// Estado de completado de una tarea hoy
type CompletionStatus = 'completed' | 'in_progress' | 'pending' | null

function CompletionBadge({ status }: { status: CompletionStatus }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-medium text-emerald-400">
        <CheckCircle2 size={10} /> Completada hoy
      </span>
    )
  }
  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-medium text-amber-400">
        <Clock size={10} /> En progreso
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/15 border border-gray-500/30 px-2 py-0.5 text-xs font-medium text-gray-400">
        <Circle size={10} /> Pendiente
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-800 border border-gray-700 px-2 py-0.5 text-xs font-medium text-gray-500">
      <Circle size={10} /> Sin actividad hoy
    </span>
  )
}

export function TasksManager({ area, tasks, onTasksChange }: Props) {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    is_recurring: true,
    specific_date: '',
  })
  const [saving, setSaving] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState<Task | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  // Estado de completado por tarea: task_id -> status más avanzado del día
  const [completions, setCompletions] = useState<Record<string, CompletionStatus>>({})

  const today = new Date().toISOString().split('T')[0]

  // Carga y suscripción en tiempo real a completions de hoy
  useEffect(() => {
    const taskIds = tasks.map(t => t.id)
    if (taskIds.length === 0) {
      setCompletions({})
      return
    }

    async function fetchCompletions() {
      const { data } = await supabase
        .from('task_completions')
        .select('task_id, status')
        .in('task_id', taskIds)
        .eq('date', today)

      if (data) {
        // Para cada tarea, tomamos el estado más avanzado del día
        const priority: Record<string, number> = { completed: 3, in_progress: 2, pending: 1 }
        const map: Record<string, CompletionStatus> = {}
        data.forEach(c => {
          const current = map[c.task_id]
          if (!current || (priority[c.status] ?? 0) > (priority[current] ?? 0)) {
            map[c.task_id] = c.status as CompletionStatus
          }
        })
        setCompletions(map)
      }
    }

    fetchCompletions()

    // Suscripción realtime
    const channel = supabase
      .channel(`completions-area-${area.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_completions' },
        () => { fetchCompletions() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [area.id, tasks.length, today])

  function openCreate() {
    setEditing(null)
    setForm({ title: '', description: '', priority: 'medium', is_recurring: true, specific_date: '' })
    setModal(true)
  }

  function openEdit(task: Task) {
    setEditing(task)
    setForm({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      is_recurring: task.is_recurring,
      specific_date: task.specific_date ?? '',
    })
    setModal(true)
  }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      is_recurring: form.is_recurring,
      specific_date: form.is_recurring ? null : form.specific_date || null,
    }

    if (editing) {
      const updated = { ...editing, ...payload }
      onTasksChange(tasks.map(t => t.id === editing.id ? updated : t))
      setModal(false)
      setSaving(false)
      await supabase.from('tasks').update(payload).eq('id', editing.id)
    } else {
      const tempId = crypto.randomUUID()
      const optimistic = {
        id: tempId,
        ...payload,
        area_id: area.id,
        order_index: tasks.length,
        created_at: new Date().toISOString(),
      }
      onTasksChange([...tasks, optimistic as any])
      setModal(false)
      setSaving(false)

      const { data } = await supabase
        .from('tasks')
        .insert({ ...payload, area_id: area.id, order_index: tasks.length })
        .select('id')
        .single()

      if (data) {
        onTasksChange([...tasks, { ...optimistic, id: (data as any).id } as any])
      }
    }
  }

  async function deleteTask() {
    if (!deleting) return
    setSaving(true)
    const prev = tasks
    onTasksChange(tasks.filter(t => t.id !== deleting.id))
    setDeleteModal(false)
    setDeleting(null)
    setSaving(false)
    await supabase.from('tasks').delete().eq('id', deleting.id)
  }

  // Drag & drop reordering
  async function handleDrop(toIdx: number) {
    if (dragIdx === null || dragIdx === toIdx) {
      setDragIdx(null)
      setDragOver(null)
      return
    }

    const reordered = [...tasks]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(toIdx, 0, moved)
    const updated = reordered.map((t, i) => ({ ...t, order_index: i }))
    onTasksChange(updated)
    setDragIdx(null)
    setDragOver(null)

    await Promise.all(
      updated.map(t =>
        supabase.from('tasks').update({ order_index: t.order_index }).eq('id', t.id)
      )
    )
  }

  const sortedTasks = [...tasks].sort((a, b) => a.order_index - b.order_index)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{tasks.length} tarea{tasks.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} />
          Nueva tarea
        </Button>
      </div>

      <div className="space-y-2">
        {sortedTasks.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6 rounded-lg border border-dashed border-gray-700">
            Sin tareas. Creá la primera.
          </p>
        )}
        {sortedTasks.map((task, idx) => (
          <div
            key={task.id}
            draggable
            onDragStart={() => setDragIdx(idx)}
            onDragOver={e => { e.preventDefault(); setDragOver(idx) }}
            onDrop={() => handleDrop(idx)}
            onDragEnd={() => { setDragIdx(null); setDragOver(null) }}
            className={`flex items-center gap-3 rounded-lg border bg-gray-900 px-4 py-3 cursor-grab active:cursor-grabbing transition-colors ${
              dragOver === idx ? 'border-violet-500/50 bg-violet-500/5' : 'border-gray-800'
            }`}
          >
            <GripVertical size={14} className="text-gray-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-100 truncate">{task.title}</p>
              {task.description && (
                <p className="text-xs text-gray-400 truncate mt-0.5">{task.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {/* Estado de completado hoy */}
                <CompletionBadge status={completions[task.id] ?? null} />

                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${priorityColor[task.priority]}`}>
                  <Flag size={9} />
                  {priorityLabel[task.priority]}
                </span>
                {task.is_recurring ? (
                  <Badge variant="info">Diaria</Badge>
                ) : (
                  <Badge variant="warning">Fecha específica</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => openEdit(task)}
                className="p-1.5 rounded text-gray-500 hover:text-gray-100 hover:bg-gray-700"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => { setDeleting(task); setDeleteModal(true) }}
                className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar tarea' : 'Nueva tarea'}>
        <div className="space-y-4">
          <Input
            label="Nombre de la tarea"
            placeholder="Ej: Limpiar la caja registradora"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">Descripción (opcional)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Instrucciones adicionales..."
              rows={3}
              className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>
          <Select
            label="Prioridad"
            value={form.priority}
            onChange={e => setForm(p => ({ ...p, priority: e.target.value as Task['priority'] }))}
          >
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </Select>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">Recurrencia</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={form.is_recurring}
                  onChange={() => setForm(p => ({ ...p, is_recurring: true }))}
                  className="accent-violet-500"
                />
                <span className="text-sm text-gray-300">Diaria (se repite todos los días)</span>
              </label>
            </div>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!form.is_recurring}
                  onChange={() => setForm(p => ({ ...p, is_recurring: false }))}
                  className="accent-violet-500"
                />
                <span className="text-sm text-gray-300">Fecha específica</span>
              </label>
            </div>
          </div>
          {!form.is_recurring && (
            <Input
              type="date"
              label="Fecha"
              value={form.specific_date}
              onChange={e => setForm(p => ({ ...p, specific_date: e.target.value }))}
            />
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={save}>
              {editing ? 'Guardar' : 'Crear tarea'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Eliminar tarea">
        <p className="text-sm text-gray-300 mb-5">
          ¿Eliminar la tarea <strong>{deleting?.title}</strong>?
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteModal(false)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={saving} onClick={deleteTask}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}
