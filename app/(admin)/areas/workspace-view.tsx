'use client'
import type { WorkArea, Task } from '@/lib/types'
import { WorkspaceTasks } from './workspace-tasks'
import { CalendarWidget } from './calendar-widget'
import { NotesWidget } from './notes-widget'

interface Props {
  area: WorkArea
  tasks: Task[]
  userId: string
  today: string
  onTasksChange: (tasks: Task[]) => void
}

export function WorkspaceView({ area, tasks, userId, today, onTasksChange }: Props) {
  const widgets: string[] = (area as any).widgets ?? []

  const hasTasks    = widgets.includes('tasks')
  const hasCalendar = widgets.includes('calendar')
  const hasNotes    = widgets.includes('notes')

  if (widgets.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-12">
        Este workspace no tiene widgets configurados. Editá el área para agregar algunos.
      </p>
    )
  }

  // Si hay tareas, ocupa todo el ancho. El resto se divide en columnas.
  return (
    <div className="space-y-6">
      {hasTasks && (
        <WorkspaceTasks
          area={area}
          initialTasks={tasks}
          userId={userId}
          today={today}
          onTasksChange={onTasksChange}
        />
      )}

      {(hasCalendar || hasNotes) && (
        <div className={`grid gap-6 ${hasCalendar && hasNotes ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {hasCalendar && <CalendarWidget areaId={area.id} userId={userId} />}
          {hasNotes    && <NotesWidget    areaId={area.id} userId={userId} />}
        </div>
      )}
    </div>
  )
}
