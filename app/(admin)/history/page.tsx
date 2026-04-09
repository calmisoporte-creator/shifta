import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatDateTime, statusLabel, priorityColor, priorityLabel } from '@/lib/utils'
import { History } from 'lucide-react'

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; area?: string }>
}) {
  const { date, area } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return null

  const filterDate = date ?? new Date().toISOString().split('T')[0]

  let query = supabase
    .from('task_completions')
    .select(`
      id, status, completed_at, date,
      tasks(title, priority, work_areas(name)),
      profiles(name),
      shifts(name)
    `)
    .order('completed_at', { ascending: false })
    .eq('date', filterDate)

  const { data: completions } = await query

  const { data: areas } = await supabase
    .from('work_areas')
    .select('id, name')
    .eq('company_id', profile.company_id)
    .order('name')

  const statusVariant = {
    pending: 'default',
    in_progress: 'warning',
    completed: 'success',
  } as const

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Historial</h1>
          <p className="text-sm text-gray-400 mt-1">Registro de completado de tareas</p>
        </div>

        <form className="flex items-center gap-3">
          <input
            type="date"
            name="date"
            defaultValue={filterDate}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
          >
            Filtrar
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tarea</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase hidden md:table-cell">Área</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase hidden sm:table-cell">Empleado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase hidden lg:table-cell">Turno</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase hidden xl:table-cell">Completada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-gray-950">
            {!completions?.length ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-gray-500">
                  No hay registros para esta fecha.
                </td>
              </tr>
            ) : (
              completions.map(c => {
                const task = c.tasks as any
                const emp = c.profiles as any
                const shift = c.shifts as any
                return (
                  <tr key={c.id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-100">{task?.title}</p>
                      {task?.priority && (
                        <span className={`text-xs ${priorityColor[task.priority as keyof typeof priorityColor]}`}>
                          {priorityLabel[task.priority as keyof typeof priorityLabel]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                      {task?.work_areas?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                      {emp?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">
                      {shift?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[c.status as keyof typeof statusVariant]}>
                        {statusLabel[c.status as keyof typeof statusLabel]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden xl:table-cell text-xs">
                      {c.completed_at ? formatDateTime(c.completed_at) : '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
