import { createClient } from '@/lib/supabase/server'
import { TasksClient } from './tasks-client'
import { formatTime } from '@/lib/utils'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toTimeString().slice(0, 5)

  // Obtener área del empleado
  const { data: userArea } = await supabase
    .from('user_areas')
    .select('area_id, work_areas(name, shifts(*))')
    .eq('user_id', user.id)
    .single()

  if (!userArea) return <p className="text-gray-400 text-center mt-20">Sin área asignada</p>

  const area = userArea.work_areas as any
  const shifts: any[] = area?.shifts ?? []

  // Turno activo (el último que haya arrancado antes de ahora)
  const activeShift = [...shifts]
    .filter(s => s.start_time <= now)
    .sort((a, b) => b.start_time.localeCompare(a.start_time))[0] ?? null

  // Siguiente turno
  const nextShift = [...shifts]
    .filter(s => s.start_time > now)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))[0] ?? null

  // Tareas del área (recurrentes de hoy + específicas de hoy)
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('area_id', userArea.area_id)
    .or(`is_recurring.eq.true,specific_date.eq.${today}`)
    .order('order_index', { ascending: true })

  // Completions del empleado para hoy
  const { data: completions } = await supabase
    .from('task_completions')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .eq('shift_id', activeShift?.id ?? '00000000-0000-0000-0000-000000000000')

  return (
    <TasksClient
      tasks={tasks ?? []}
      completions={completions ?? []}
      userId={user.id}
      areaName={area?.name ?? 'Mi área'}
      activeShift={activeShift}
      nextShift={nextShift}
      today={today}
    />
  )
}
