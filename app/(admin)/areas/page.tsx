import { createClient } from '@/lib/supabase/server'
import { AreasClient } from './areas-client'

export default async function AreasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return null

  const { data: areas } = await supabase
    .from('work_areas')
    .select('*, shifts(*), tasks(count)')
    .eq('company_id', profile.company_id)
    .order('order_index', { ascending: true })

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .in('area_id', (areas ?? []).map(a => a.id))
    .order('order_index', { ascending: true })

  return (
    <AreasClient
      initialAreas={areas ?? []}
      tasks={tasks ?? []}
      companyId={profile.company_id}
    />
  )
}
