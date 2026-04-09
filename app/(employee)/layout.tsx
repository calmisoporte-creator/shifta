import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogOut, Zap } from 'lucide-react'
import { EmployeeLogout } from '@/components/employee/employee-logout'

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id, name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role === 'admin') redirect('/admin/dashboard')
  if (!profile.company_id) redirect('/onboarding')

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', profile.company_id!)
    .single()

  // Verificar si eligió área
  const { data: userArea } = await supabase
    .from('user_areas')
    .select('area_id')
    .eq('user_id', user.id)
    .single()

  if (!userArea) redirect('/choose-area')

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header móvil */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600">
            <Zap size={13} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-100">{profile.name}</p>
            <p className="text-xs text-gray-500">{company?.name}</p>
          </div>
        </div>
        <EmployeeLogout />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
