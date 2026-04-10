import { getSupabase, getProfile } from '@/lib/supabase/cached'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Layers, Users, CheckCircle2, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function DashboardPage() {
  const [supabase, profile] = await Promise.all([getSupabase(), getProfile()])
  if (!profile?.company_id) return null

  const companyId = profile.company_id
  const today = new Date().toISOString().split('T')[0]

  // Primero obtenemos los IDs de áreas para usarlos en la query de tareas
  const { data: areas } = await supabase
    .from('work_areas')
    .select('id')
    .eq('company_id', companyId)

  const areaIds = (areas ?? []).map((a: any) => a.id)

  const [
    { count: areasCount },
    { count: employeesCount },
    { count: tasksCount },
    { data: recentCompletions },
  ] = await Promise.all([
    supabase.from('work_areas').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('role', 'employee').eq('is_active', true),
    areaIds.length > 0
      ? supabase.from('tasks').select('*', { count: 'exact', head: true }).in('area_id', areaIds)
      : Promise.resolve({ count: 0 }),
    supabase
      .from('task_completions')
      .select(`
        id, status, completed_at,
        tasks(title),
        profiles(name),
        shifts(name)
      `)
      .eq('date', today)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(10),
  ])

  const stats = [
    { label: 'Áreas activas', value: areasCount ?? 0, icon: Layers, color: 'text-violet-400' },
    { label: 'Empleados', value: employeesCount ?? 0, icon: Users, color: 'text-blue-400' },
    { label: 'Tareas totales', value: tasksCount ?? 0, icon: CheckCircle2, color: 'text-green-400' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">{formatDate(new Date().toISOString())}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4">
                <div className={`rounded-lg bg-gray-800 p-3 ${stat.color}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-100">{stat.value}</p>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Completions hoy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={16} className="text-gray-400" />
            Tareas completadas hoy
            <Badge variant="success">{recentCompletions?.length ?? 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!recentCompletions?.length ? (
            <p className="text-sm text-gray-500 text-center py-4">No hay tareas completadas hoy todavía.</p>
          ) : (
            <div className="space-y-2">
              {recentCompletions.map(c => (
                <div key={c.id} className="flex items-center justify-between rounded-lg bg-gray-800/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-100">
                      {(c.tasks as any)?.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      por {(c.profiles as any)?.name}
                      {(c.shifts as any)?.name ? ` · Turno ${(c.shifts as any).name}` : ''}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {c.completed_at ? new Date(c.completed_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
