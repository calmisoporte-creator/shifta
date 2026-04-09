import { createClient } from '@/lib/supabase/server'
import { EmployeesClient } from './employees-client'

export default async function EmployeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return null

  const [{ data: employees }, { data: areas }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*, user_areas(area_id, work_areas(name))')
      .eq('company_id', profile.company_id)
      .eq('role', 'employee')
      .order('created_at', { ascending: false }),
    supabase
      .from('work_areas')
      .select('id, name, access_type')
      .eq('company_id', profile.company_id)
      .order('order_index'),
  ])

  return (
    <EmployeesClient
      employees={employees ?? []}
      areas={areas ?? []}
    />
  )
}
