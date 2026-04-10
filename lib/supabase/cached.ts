import { cache } from 'react'
import { createClient } from './server'

// createClient cacheado por request — se reutiliza en el mismo render
export const getSupabase = cache(async () => {
  return createClient()
})

// Perfil del usuario actual cacheado por request
export const getProfile = cache(async () => {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, name, role, company_id, is_active')
    .eq('id', user.id)
    .single()

  return data
})
