'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserPlus, Building2 } from 'lucide-react'
import { use } from 'react'

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [company, setCompany] = useState<{ id: string; name: string } | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadCompany() {
      const supabase = createClient()
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .eq('invite_token', token)
        .single()

      if (!data) setNotFound(true)
      else setCompany(data)
    }
    loadCompany()
  }, [token])

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!company) return
    setError('')

    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          role: 'employee',
          company_id: company.id,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name: form.name,
        role: 'employee',
        company_id: company.id,
      })

      router.push('/tasks')
      router.refresh()
    }
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-100">Link inválido</p>
          <p className="mt-2 text-sm text-gray-400">El link de invitación no es válido o expiró.</p>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 mb-4">
            <Building2 size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-100">Unirse a {company.name}</h1>
          <p className="mt-1 text-sm text-gray-400">Creá tu cuenta de empleado</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="name"
            label="Nombre completo"
            placeholder="Juan García"
            value={form.name}
            onChange={update('name')}
            required
          />
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="tu@email.com"
            value={form.email}
            onChange={update('email')}
            required
          />
          <Input
            id="password"
            type="password"
            label="Contraseña"
            placeholder="••••••••"
            value={form.password}
            onChange={update('password')}
            required
          />
          <Input
            id="confirm"
            type="password"
            label="Confirmar contraseña"
            placeholder="••••••••"
            value={form.confirm}
            onChange={update('confirm')}
            required
          />

          {error && (
            <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            <UserPlus size={16} />
            Unirme a {company.name}
          </Button>
        </form>
      </div>
    </div>
  )
}
