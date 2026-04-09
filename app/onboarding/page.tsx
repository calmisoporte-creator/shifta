'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building2, ChevronRight } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim()) return
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({ name: companyName.trim(), owner_id: user.id })
      .select()
      .single()

    if (companyError || !company) {
      setError(companyError?.message ?? 'No se pudo crear la empresa')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ company_id: company.id, role: 'admin' })
      .eq('id', user.id)

    if (profileError) {
      setError('No se pudo actualizar tu perfil')
      setLoading(false)
      return
    }

    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 mb-4">
            <Building2 size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-100">Creá tu empresa</h1>
          <p className="mt-1 text-sm text-gray-400">
            Configurá tu empresa para empezar a gestionar tareas y turnos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="company"
            label="Nombre de la empresa"
            placeholder="Mi Empresa S.A."
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            required
          />

          {error && (
            <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Crear empresa
            <ChevronRight size={16} />
          </Button>
        </form>
      </div>
    </div>
  )
}
