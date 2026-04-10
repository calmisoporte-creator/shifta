'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Copy, Building2, Link2, RefreshCw, ShieldCheck } from 'lucide-react'
import type { Company } from '@/lib/types'

interface Props {
  company: Company
  adminName: string
  baseUrl: string
}

function CopyLinkRow({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3">
      <p className="flex-1 text-sm text-gray-300 truncate font-mono">{url}</p>
      <button
        onClick={copy}
        className="flex items-center gap-1.5 rounded-md bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-100 hover:bg-gray-600 transition-colors flex-shrink-0"
      >
        {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
      </button>
    </div>
  )
}

export function SettingsClient({ company: initial, adminName, baseUrl }: Props) {
  const supabase = createClient()
  const [company, setCompany] = useState(initial)
  const [name, setName] = useState(initial.name)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regeneratingAdmin, setRegeneratingAdmin] = useState(false)

  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  const employeeInviteUrl = `${origin}/invite/${company.invite_token}`
  const adminInviteUrl    = `${origin}/invite/admin/${(company as any).admin_invite_token ?? ''}`

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

  async function regenerateEmployeeToken() {
    if (!confirm('¿Regenerar el link de empleados? El link anterior quedará inválido.')) return
    setRegenerating(true)
    const newToken = crypto.randomUUID().replace(/-/g, '')
    const { data } = await supabase
      .from('companies')
      .update({ invite_token: newToken })
      .eq('id', company.id)
      .select()
      .single()
    if (data) setCompany(data)
    setRegenerating(false)
  }

  async function regenerateAdminToken() {
    if (!confirm('¿Regenerar el link de admins? El link anterior quedará inválido.')) return
    setRegeneratingAdmin(true)
    const newToken = crypto.randomUUID().replace(/-/g, '')
    const { data } = await supabase
      .from('companies')
      .update({ admin_invite_token: newToken })
      .eq('id', company.id)
      .select()
      .single()
    if (data) setCompany(data)
    setRegeneratingAdmin(false)
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

      {/* Link empleados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 size={16} className="text-gray-400" />
            Link de invitación — Empleados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-400">
            Compartí este link para que los empleados se registren en tu empresa.
          </p>
          <CopyLinkRow url={employeeInviteUrl} label="empleados" />
          <Button variant="secondary" size="sm" onClick={regenerateEmployeeToken} loading={regenerating}>
            <RefreshCw size={13} /> Regenerar link
          </Button>
          <p className="text-xs text-gray-500">Al regenerar, el link anterior deja de funcionar.</p>
        </CardContent>
      </Card>

      {/* Link co-admins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-violet-400" />
            Link de invitación — Co-administradores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-400">
            Compartí este link con tu socio o co-admin. Tendrá acceso completo al panel de administración.
          </p>
          {(company as any).admin_invite_token ? (
            <>
              <CopyLinkRow url={adminInviteUrl} label="admins" />
              <Button variant="secondary" size="sm" onClick={regenerateAdminToken} loading={regeneratingAdmin}>
                <RefreshCw size={13} /> Regenerar link
              </Button>
              <p className="text-xs text-gray-500">Al regenerar, el link anterior deja de funcionar.</p>
            </>
          ) : (
            <p className="text-sm text-amber-400">
              Ejecutá el SQL de actualización en Supabase para habilitar esta función.
            </p>
          )}
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
