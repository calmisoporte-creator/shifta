import { getSupabase, getProfile } from '@/lib/supabase/cached'
import { AreasClient } from './areas-client'

export default async function AreasPage() {
  const [supabase, profile] = await Promise.all([getSupabase(), getProfile()])
  if (!profile?.company_id) return null

  const today = new Date().toISOString().split('T')[0]

  const { data: areas } = await supabase
    .from('work_areas')
    .select('*, shifts(*)')
    .eq('company_id', profile.company_id)
    .order('order_index', { ascending: true })

  const areaIds = (areas ?? []).map((a: any) => a.id)

  const { data: tasks } = areaIds.length > 0
    ? await supabase.from('tasks').select('*').in('area_id', areaIds).order('order_index', { ascending: true })
    : { data: [] }

  return (
    <AreasClient
      initialAreas={areas ?? []}
      tasks={tasks ?? []}
      companyId={profile.company_id}
      userId={profile.id}
      today={today}
    />
  )
}
