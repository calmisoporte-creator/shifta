'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import type { Task, TaskCompletion, TaskStatus } from '@/lib/types'
import { priorityColor, priorityLabel, formatTime } from '@/lib/utils'
import { CheckCircle2, Circle, Clock3, Flag, ChevronRight, Loader2 } from 'lucide-react'

interface Props {
  tasks: Task[]
  completions: TaskCompletion[]
  userId: string
  areaName: string
  activeShift: { id: string; name: string; start_time: string } | null
  nextShift: { id: string; name: string; start_time: string } | null
  today: string
}

const statusCycle: Record<TaskStatus, TaskStatus> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: 'pending',
}

export function TasksClient({ tasks, completions: initial, userId, areaName, activeShift, nextShift, today }: Props) {
  const supabase = createClient()
  const [completions, setCompletions] = useState<TaskCompletion[]>(initial)
  const [updating, setUpdating] = useState<Set<string>>(new Set())

  function getCompletion(taskId: string): TaskCompletion | undefined {
    return completions.find(c => c.task_id === taskId)
  }

  function getStatus(taskId: string): TaskStatus {
    return getCompletion(taskId)?.status ?? 'pending'
  }

  async function cycleStatus(task: Task) {
    const current = getStatus(task.id)
    const next = statusCycle[current]

    setUpdating(prev => new Set([...prev, task.id]))

    const existing = getCompletion(task.id)
    const now = new Date().toISOString()

    if (existing) {
      const { data } = await supabase
        .from('task_completions')
        .update({
          status: next,
          completed_at: next === 'completed' ? now : null,
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (data) setCompletions(prev => prev.map(c => c.id === data.id ? data : c))
    } else {
      const { data } = await supabase
        .from('task_completions')
        .insert({
          task_id: task.id,
          user_id: userId,
          shift_id: activeShift?.id ?? null,
          status: next,
          completed_at: next === 'completed' ? now : null,
          date: today,
        })
        .select()
        .single()
      if (data) setCompletions(prev => [...prev, data])
    }

    setUpdating(prev => { const s = new Set(prev); s.delete(task.id); return s })
  }

  const pendingCount = tasks.filter(t => getStatus(t.id) === 'pending').length
  const inProgressCount = tasks.filter(t => getStatus(t.id) === 'in_progress').length
  const completedCount = tasks.filter(t => getStatus(t.id) === 'completed').length

  return (
    <div>
      {/* Header área */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-100">{areaName}</h1>
        {activeShift ? (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-sm text-gray-300">
              Turno activo: <span className="font-medium text-green-400">{activeShift.name}</span>
              {' '}— desde las {formatTime(activeShift.start_time)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-1">Sin turno activo</p>
        )}
        {nextShift && (
          <p className="text-xs text-gray-500 mt-1">
            Próximo: {nextShift.name} a las {formatTime(nextShift.start_time)}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-300">Progreso del turno</p>
          <p className="text-sm font-bold text-gray-100">
            {completedCount}/{tasks.length}
          </p>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-500"
            style={{ width: tasks.length ? `${(completedCount / tasks.length) * 100}%` : '0%' }}
          />
        </div>
        <div className="flex gap-4 mt-3">
          <span className="text-xs text-gray-500">{pendingCount} pendientes</span>
          <span className="text-xs text-yellow-500">{inProgressCount} en progreso</span>
          <span className="text-xs text-green-500">{completedCount} completadas</span>
        </div>
      </div>

      {/* Lista de tareas */}
      <div className="space-y-3">
        {tasks.length === 0 && (
          <p className="text-center text-gray-500 py-12">No hay tareas para hoy.</p>
        )}
        {tasks.map(task => {
          const status = getStatus(task.id)
          const isUpdating = updating.has(task.id)

          return (
            <button
              key={task.id}
              onClick={() => !isUpdating && cycleStatus(task)}
              disabled={isUpdating}
              className={`w-full flex items-start gap-4 rounded-xl border p-4 text-left transition-all active:scale-[0.99] ${
                status === 'completed'
                  ? 'border-green-500/20 bg-green-500/5'
                  : status === 'in_progress'
                  ? 'border-yellow-500/20 bg-yellow-500/5'
                  : 'border-gray-800 bg-gray-900 hover:border-gray-700'
              }`}
            >
              {/* Icono de estado */}
              <div className="mt-0.5 flex-shrink-0">
                {isUpdating ? (
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                ) : status === 'completed' ? (
                  <CheckCircle2 size={20} className="text-green-500" />
                ) : status === 'in_progress' ? (
                  <Clock3 size={20} className="text-yellow-500" />
                ) : (
                  <Circle size={20} className="text-gray-600" />
                )}
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  status === 'completed' ? 'line-through text-gray-500' : 'text-gray-100'
                }`}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{task.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${priorityColor[task.priority]}`}>
                    <Flag size={9} />
                    {priorityLabel[task.priority]}
                  </span>
                  {status === 'in_progress' && (
                    <Badge variant="warning">En progreso</Badge>
                  )}
                  {status === 'completed' && (
                    <Badge variant="success">Completada</Badge>
                  )}
                </div>
              </div>

              <ChevronRight size={16} className="text-gray-600 flex-shrink-0 mt-1" />
            </button>
          )
        })}
      </div>

      {/* Hint */}
      {tasks.length > 0 && (
        <p className="text-center text-xs text-gray-600 mt-6">
          Tocá una tarea para cambiar su estado
        </p>
      )}
    </div>
  )
}
