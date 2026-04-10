'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import type { WorkArea, Shift, Task } from '@/lib/types'
import { Plus, Edit2, Trash2, Clock, ListTodo, Users, Lock } from 'lucide-react'
import { ShiftsManager } from './shifts-manager'
import { TasksManager } from './tasks-manager'

interface Props {
  initialAreas: (WorkArea & { shifts: Shift[] })[]
  tasks: Task[]
  companyId: string
}

export function AreasClient({ initialAreas, tasks, companyId }: Props) {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [areas, setAreas] = useState(initialAreas)
  const [allTasks, setAllTasks] = useState(tasks)

  // Solo guardamos el ID — el área se deriva de `areas`
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  const selectedArea = areas.find(a => a.id === selectedAreaId) ?? null

  const [tab, setTab] = useState<'shifts' | 'tasks'>('tasks')
  const [areaModal, setAreaModal] = useState(false)
  const [editingArea, setEditingArea] = useState<WorkArea | null>(null)
  const [form, setForm] = useState({ name: '', access_type: 'employees' as 'employees' | 'admins_only' })
  const [saving, setSaving] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deletingArea, setDeletingArea] = useState<WorkArea | null>(null)

  function openCreate() {
    setEditingArea(null)
    setForm({ name: '', access_type: 'employees' })
    setAreaModal(true)
  }

  function openEdit(area: WorkArea) {
    setEditingArea(area)
    setForm({ name: area.name, access_type: area.access_type })
    setAreaModal(true)
  }

  async function saveArea() {
    if (!form.name.trim()) return
    setSaving(true)

    if (editingArea) {
      // Optimistic
      setAreas(prev => prev.map(a => a.id === editingArea.id ? { ...a, name: form.name.trim(), access_type: form.access_type } : a))
      setAreaModal(false)
      setSaving(false)
      await supabase.from('work_areas').update({ name: form.name.trim(), access_type: form.access_type }).eq('id', editingArea.id)
    } else {
      const tempId = crypto.randomUUID()
      const optimistic = { id: tempId, name: form.name.trim(), access_type: form.access_type, company_id: companyId, order_index: areas.length, created_at: new Date().toISOString(), shifts: [] }
      setAreas(prev => [...prev, optimistic as any])
      setAreaModal(false)
      setSaving(false)

      const { data } = await supabase
        .from('work_areas')
        .insert({ name: form.name.trim(), access_type: form.access_type, company_id: companyId, order_index: areas.length })
        .select('*, shifts(*)')
        .single()

      if (data) {
        setAreas(prev => prev.map(a => a.id === tempId ? data as any : a))
        setSelectedAreaId((data as any).id)
      }
    }
  }

  async function deleteArea() {
    if (!deletingArea) return
    setSaving(true)
    setAreas(prev => prev.filter(a => a.id !== deletingArea.id))
    setAllTasks(prev => prev.filter(t => t.area_id !== deletingArea.id))
    if (selectedAreaId === deletingArea.id) setSelectedAreaId(null)
    setSaving(false)
    setDeleteModal(false)
    setDeletingArea(null)
    await supabase.from('work_areas').delete().eq('id', deletingArea.id)
  }

  return (
    <div className="flex h-full">
      {/* Lista de áreas */}
      <div className="w-72 flex-shrink-0 border-r border-gray-800 flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-4">
          <h1 className="text-base font-semibold text-gray-100">Áreas de trabajo</h1>
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {areas.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">No hay áreas todavía.</p>
          )}
          {areas.map(area => (
            <button
              key={area.id}
              onClick={() => { setSelectedAreaId(area.id); setTab('tasks') }}
              className={`w-full flex items-start justify-between rounded-lg px-3 py-3 text-left transition-colors ${
                selectedAreaId === area.id
                  ? 'bg-violet-600/15 border border-violet-500/30'
                  : 'hover:bg-gray-800 border border-transparent'
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-100 truncate">{area.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {area.access_type === 'admins_only' ? (
                    <Badge variant="warning"><Lock size={10} /> Solo admins</Badge>
                  ) : (
                    <Badge variant="info"><Users size={10} /> Empleados</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1 ml-2 flex-shrink-0">
                <button onClick={e => { e.stopPropagation(); openEdit(area) }} className="p-1.5 rounded text-gray-500 hover:text-gray-100 hover:bg-gray-700">
                  <Edit2 size={12} />
                </button>
                <button onClick={e => { e.stopPropagation(); setDeletingArea(area); setDeleteModal(true) }} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10">
                  <Trash2 size={12} />
                </button>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detalle del área */}
      <div className="flex-1 overflow-y-auto">
        {!selectedArea ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-500">Seleccioná un área para configurarla</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-100">{selectedArea.name}</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {selectedArea.access_type === 'admins_only' ? 'Solo administradores' : 'Área visible para empleados'}
              </p>
            </div>

            <div className="flex gap-1 rounded-lg bg-gray-800 p-1 w-fit mb-6">
              <button onClick={() => setTab('tasks')} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === 'tasks' ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:text-gray-100'}`}>
                <ListTodo size={14} /> Tareas
              </button>
              <button onClick={() => setTab('shifts')} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === 'shifts' ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:text-gray-100'}`}>
                <Clock size={14} /> Turnos
              </button>
            </div>

            {tab === 'tasks' && (
              <TasksManager
                area={selectedArea}
                tasks={allTasks.filter(t => t.area_id === selectedArea.id)}
                onTasksChange={updated => setAllTasks(prev => [
                  ...prev.filter(t => t.area_id !== selectedArea.id),
                  ...updated,
                ])}
              />
            )}

            {tab === 'shifts' && (
              <ShiftsManager
                area={selectedArea}
                initialShifts={selectedArea.shifts ?? []}
              />
            )}
          </div>
        )}
      </div>

      {/* Modal crear/editar área */}
      <Modal open={areaModal} onClose={() => setAreaModal(false)} title={editingArea ? 'Editar área' : 'Nueva área de trabajo'}>
        <div className="space-y-4">
          <Input label="Nombre del área" placeholder="Ej: Atención al cliente" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <Select label="Tipo de acceso" value={form.access_type} onChange={e => setForm(p => ({ ...p, access_type: e.target.value as any }))}>
            <option value="employees">Con empleados — visible para todos</option>
            <option value="admins_only">Solo admins — invisible para empleados</option>
          </Select>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setAreaModal(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={saveArea}>{editingArea ? 'Guardar cambios' : 'Crear área'}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal eliminar área */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Eliminar área">
        <p className="text-sm text-gray-300 mb-5">
          ¿Eliminar el área <strong>{deletingArea?.name}</strong>? Se eliminarán todas sus tareas y turnos.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteModal(false)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={saving} onClick={deleteArea}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}
