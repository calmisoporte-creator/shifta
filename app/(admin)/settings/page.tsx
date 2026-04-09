import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, name')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return null

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', profile.company_id)
    .single()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <SettingsClient
      company={company!}
      adminName={profile.name}
      baseUrl={baseUrl}
    />
  )
}
