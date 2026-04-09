'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Layers, Check } from 'lucide-react'

interface Area {
  id: string
  name: string
  shifts: Array<{ name: string; start_time: string }>
}

export default function ChooseAreaPage() {
  const router = useRouter()
  const [areas, setAreas] = useState<Area[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) { router.push('/login'); return }

      const { data } = await supabase
        .from('work_areas')
        .select('id, name, shifts(name, start_time)')
        .eq('company_id', profile.company_id)
        .eq('access_type', 'employees')
        .order('order_index')

      setAreas(data as Area[] ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function confirm() {
    if (!selected) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('user_areas').insert({
      user_id: user.id,
      area_id: selected,
    })

    if (!error) {
      router.push('/tasks')
      router.refresh()
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 mb-4">
            <Layers size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-100">Elegí tu área</h1>
          <p className="mt-1 text-sm text-gray-400">
            Seleccioná el área donde trabajás. Podrás pedir al admin que te reasigne más adelante.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {areas.map(area => (
            <button
              key={area.id}
              onClick={() => setSelected(area.id)}
              className={`w-full rounded-xl border p-4 text-left transition-all ${
                selected === area.id
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-gray-800 bg-gray-900 hover:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-100">{area.name}</p>
                  {area.shifts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[...area.shifts].sort((a, b) => a.start_time.localeCompare(b.start_time)).map(s => (
                        <Badge key={s.name} variant="default">
                          {s.name} {s.start_time.slice(0, 5)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                {selected === area.id && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 flex-shrink-0">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <Button className="w-full" size="lg" disabled={!selected} loading={saving} onClick={confirm}>
          Confirmar área
        </Button>
      </div>
    </div>
  )
}
