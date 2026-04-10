'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WorkArea, Task, TaskCompletion, TaskStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import {
  ListTodo, Plus, Edit2, Trash2, CheckCircle2, Circle, Clock3,
  Flag, GripVertical, Loader2,
} from 'lucide-react'
import { priorityColor, priorityLabel } from '@/lib/utils'

interface Props {
  area: WorkArea
  initialTasks: Task[]
  userId: string
  today: string
  onTasksChange: (tasks: Task[]) => void
}

const statusCycle: Record<TaskStatus, TaskStatus> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: 'pending',
}

export function WorkspaceTasks({ area, initialTasks, userId, today, onTasksChange }: Props) {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [completions, setCompletions] = useState<TaskCompletion[]>([])
  const [updating, setUpdating] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' as Task['priority'] })
  const [saving, setSaving] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState<Task | null>(null)

  useEffect(() => { setTasks(initialTasks) }, [area.id])

  // Cargar completions del admin para hoy
  useEffect(() => {
    if (tasks.length === 0) return
    supabase
      .from('task_completions')
      .select('*')
      .in('task_id', tasks.map(t => t.id))
      .eq('user_id', userId)
      .eq('date', today)
      .then(({ data }) => setCompletions(data ?? []))
  }, [area.id, tasks.length, today])

  function getStatus(taskId: string): TaskStatus {
    return completions.find(c => c.task_id === taskId)?.status ?? 'pending'
  }

  async function cycleStatus(task: Task) {
    const current = getStatus(task.id)
    const next = statusCycle[current]
    setUpdating(prev => new Set([...prev, task.id]))

    const existing = completions.find(c => c.task_id === task.id)
    const now = new Date().toISOString()

    if (existing) {
      const { data } = await supabase
        .from('task_completions')
        .update({ status: next, completed_at: next === 'completed' ? now : null })
        .eq('id', existing.id).select().single()
      if (data) setCompletions(prev => prev.map(c => c.id === data.id ? data : c))
    } else {
      const { data } = await supabase
        .from('task_completions')
        .insert({ task_id: task.id, user_id: userId, shift_id: null, status: next, completed_at: next === 'completed' ? now : null, date: today })
        .select().single()
      if (data) setCompletions(prev => [...prev, data])
    }

    setUpdating(prev => { const s = new Set(prev); s.delete(task.id); return s })
  }

  function openCreate() {
    setEditing(null)
    setForm({ title: '', description: '', priority: 'medium' })
    setModal(true)
  }

  function openEdit(task: Task) {
    setEditing(task)
    setForm({ title: task.title, description: task.description ?? '', priority: task.priority })
    setModal(true)
  }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      is_recurring: true,
    }

    if (editing) {
      const updated = { ...editing, ...payload }
      const newTasks = tasks.map(t => t.id === editing.id ? updated : t)
      setTasks(newTasks)
      onTasksChange(newTasks)
      setModal(false); setSaving(false)
      await supabase.from('tasks').update(payload).eq('id', editing.id)
    } else {
      const tempId = crypto.randomUUID()
      const optimistic = { id: tempId, ...payload, area_id: area.id, order_index: tasks.length, specific_date: null, created_at: new Date().toISOString() } as Task
      const newTasks = [...tasks, optimistic]
      setTasks(newTasks)
      onTasksChange(newTasks)
      setModal(false); setSaving(false)

      const { data } = await supabase
        .from('tasks')
        .insert({ ...payload, area_id: area.id, order_index: tasks.length })
        .select().single()

      if (data) {
        const replaced = newTasks.map(t => t.id === tempId ? data as Task : t)
        setTasks(replaced)
        onTasksChange(replaced)
      }
    }
  }

  async function deleteTask() {
    if (!deleting) return
    setSaving(true)
    const newTasks = tasks.filter(t => t.id !== deleting.id)
    setTasks(newTasks)
    onTasksChange(newTasks)
    setDeleteModal(false); setDeleting(null); setSaving(false)
    await supabase.from('tasks').delete().eq('id', deleting.id)
  }

  const completedCount = tasks.filter(t => getStatus(t.id) === 'completed').length
  const sortedTasks = [...tasks].sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <ListTodo size={15} className="text-violet-400" />
          <h3 className="text-sm font-semibold text-gray-100">Lista de tareas</h3>
          {tasks.length > 0 && (
            <span className="text-xs text-gray-500">{completedCount}/{tasks.length} completadas</span>
          )}
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={13} /> Nueva
        </Button>
      </div>

      {/* Barra de progreso */}
      {tasks.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-800/50">
          <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-500"
              style={{ width: `${(completedCount / tasks.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="p-3 space-y-1.5">
        {sortedTasks.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6">
            Sin tareas. Creá la primera.
          </p>
        )}
        {sortedTasks.map(task => {
          const status = getStatus(task.id)
          const isUpdating = updating.has(task.id)

          return (
            <div
              key={task.id}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                status === 'completed'
                  ? 'border-green-500/20 bg-green-500/5'
                  : status === 'in_progress'
                  ? 'border-yellow-500/20 bg-yellow-500/5'
                  : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              {/* Toggle estado */}
              <button
                onClick={() => !isUpdating && cycleStatus(task)}
                disabled={isUpdating}
                className="flex-shrink-0"
              >
                {isUpdating ? (
                  <Loader2 size={18} className="animate-spin text-gray-400" />
                ) : status === 'completed' ? (
                  <CheckCircle2 size={18} className="text-green-500" />
                ) : status === 'in_progress' ? (
                  <Clock3 size={18} className="text-yellow-500" />
                ) : (
                  <Circle size={18} className="text-gray-600 hover:text-gray-400" />
                )}
              </button>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${status === 'completed' ? 'line-through text-gray-500' : 'text-gray-100'}`}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{task.description}</p>
                )}
                <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs font-medium mt-1 ${priorityColor[task.priority]}`}>
                  <Flag size={8} /> {priorityLabel[task.priority]}
                </span>
              </div>

              {/* Acciones */}
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(task)} className="p-1.5 rounded text-gray-500 hover:text-gray-100 hover:bg-gray-700">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => { setDeleting(task); setDeleteModal(true) }} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal crear/editar */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar tarea' : 'Nueva tarea'}>
        <div className="space-y-4">
          <Input label="Tarea" placeholder="Ej: Revisar propuestas de diseño" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">Descripción (opcional)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2}
              placeholder="Detalles..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>
          <Select label="Prioridad" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as Task['priority'] }))}>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </Select>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={save}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal eliminar */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Eliminar tarea">
        <p className="text-sm text-gray-300 mb-5">¿Eliminar <strong>{deleting?.title}</strong>?</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteModal(false)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={saving} onClick={deleteTask}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}
