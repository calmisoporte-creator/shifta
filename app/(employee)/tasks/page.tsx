import { createClient } from '@/lib/supabase/server'
import { TasksClient } from './tasks-client'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = new Date().toISOString().split('T')[0]

  // Obtener área del empleado
  const { data: userArea } = await supabase
    .from('user_areas')
    .select('area_id, work_areas(name)')
    .eq('user_id', user.id)
    .single()

  if (!userArea) return <p className="text-gray-400 text-center mt-20">Sin área asignada</p>

  const area = userArea.work_areas as any

  // Tareas del área (recurrentes + específicas de hoy)
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

  // Horarios del empleado para hoy
  const { data: employeeShifts } = await supabase
    .from('employee_shifts')
    .select('*')
    .eq('user_id', user.id)
    .eq('area_id', userArea.area_id)
    .eq('date', today)
    .order('start_time', { ascending: true })

  return (
    <TasksClient
      tasks={tasks ?? []}
      completions={completions ?? []}
      userId={user.id}
      areaId={userArea.area_id}
      areaName={area?.name ?? 'Mi área'}
      today={today}
      initialEmployeeShifts={(employeeShifts ?? []) as any}
    />
  )
}
