'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Copy, Building2, Link2, RefreshCw } from 'lucide-react'
import type { Company } from '@/lib/types'

interface Props {
  company: Company
  adminName: string
  baseUrl: string
}

export function SettingsClient({ company: initial, adminName, baseUrl }: Props) {
  const supabase = createClient()
  const [company, setCompany] = useState(initial)
  const [name, setName] = useState(initial.name)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const inviteUrl = `${baseUrl}/invite/${company.invite_token}`

  async function saveName() {
    if (!name.trim() || name === company.name) return
    setSaving(true)
    const { data } = await supabase
      .from('companies')
      .update({ name: name.trim() })
      .eq('id', company.id)
      .select()
      .single()
    if (data) {
      setCompany(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function regenerateToken() {
    if (!confirm('¿Regenerar el link de invitación? El link anterior quedará inválido.')) return
    setRegenerating(true)
    const newToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
    const { data } = await supabase
      .from('companies')
      .update({ invite_token: newToken })
      .eq('id', company.id)
      .select()
      .single()
    if (data) setCompany(data)
    setRegenerating(false)
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">Configuración</h1>

      {/* Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 size={16} className="text-gray-400" />
            Datos de la empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Nombre de la empresa"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <Button onClick={saveName} loading={saving} disabled={name === company.name}>
            {saved ? <><Check size={14} /> Guardado</> : 'Guardar cambios'}
          </Button>
        </CardContent>
      </Card>

      {/* Link de invitación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 size={16} className="text-gray-400" />
            Link de invitación para empleados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-400">
            Compartí este link para que los empleados se registren en tu empresa.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3">
            <p className="flex-1 text-sm text-gray-300 truncate font-mono">{inviteUrl}</p>
            <button
              onClick={copyInvite}
              className="flex items-center gap-1.5 rounded-md bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-100 hover:bg-gray-600 transition-colors"
            >
              {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
            </button>
          </div>
          <Button variant="secondary" size="sm" onClick={regenerateToken} loading={regenerating}>
            <RefreshCw size={13} />
            Regenerar link
          </Button>
          <p className="text-xs text-gray-500">
            Al regenerar, el link anterior deja de funcionar.
          </p>
        </CardContent>
      </Card>

      {/* Info admin */}
      <Card>
        <CardHeader>
          <CardTitle>Tu cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-300">
            <span className="text-gray-500">Nombre:</span> {adminName}
          </p>
          <p className="text-sm text-gray-300 mt-1">
            <span className="text-gray-500">Rol:</span>{' '}
            <span className="text-violet-400">Administrador</span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
