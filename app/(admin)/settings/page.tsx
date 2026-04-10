import { getSupabase, getProfile } from '@/lib/supabase/cached'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const [supabase, profile] = await Promise.all([getSupabase(), getProfile()])
  if (!profile?.company_id) return null

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', profile.company_id)
    .single()

  return (
    <SettingsClient
      company={company!}
      adminName={profile.name}
      baseUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
    />
  )
}
