'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WorkArea } from '@/lib/types'
import { Clock, User, CalendarDays } from 'lucide-react'

interface Props {
  area: WorkArea
}

interface EmployeeShift {
  id: string
  user_id: string
  start_time: string
  end_time: string
  profiles: { name: string } | null
}

interface GroupedEmployee {
  user_id: string
  name: string
  ranges: { start_time: string; end_time: string }[]
}

export function ShiftsManager({ area }: Props) {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const today = new Date().toISOString().split('T')[0]
  const [shifts, setShifts] = useState<EmployeeShift[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchShifts() {
    const { data } = await supabase
      .from('employee_shifts')
      .select('id, user_id, start_time, end_time, profiles(name)')
      .eq('area_id', area.id)
      .eq('date', today)
      .order('start_time', { ascending: true })

    setShifts((data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    fetchShifts()

    const channel = supabase
      .channel(`employee-shifts-${area.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employee_shifts' },
        () => fetchShifts()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [area.id])

  // Agrupar por empleado
  const grouped: GroupedEmployee[] = []
  for (const s of shifts) {
    const emp = grouped.find(g => g.user_id === s.user_id)
    const range = { start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5) }
    if (emp) {
      emp.ranges.push(range)
    } else {
      grouped.push({
        user_id: s.user_id,
        name: (s.profiles as any)?.name ?? 'Empleado',
        ranges: [range],
      })
    }
  }

  const todayLabel = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <CalendarDays size={14} className="text-gray-400" />
        <p className="text-sm text-gray-400 capitalize">{todayLabel}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : grouped.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-10 rounded-lg border border-dashed border-gray-700">
          Ningún empleado cargó su horario hoy todavía.
        </p>
      ) : (
        <div className="space-y-3">
          {grouped.map(emp => (
            <div
              key={emp.user_id}
              className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600/20 border border-violet-500/30">
                  <User size={13} className="text-violet-400" />
                </div>
                <p className="text-sm font-medium text-gray-100">{emp.name}</p>
              </div>
              <div className="flex flex-wrap gap-2 pl-9">
                {emp.ranges.map((r, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gray-800 border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300"
                  >
                    <Clock size={10} className="text-violet-400" />
                    {r.start_time} – {r.end_time}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-600 mt-4 text-center">
        Se actualiza en tiempo real cuando los empleados cargan su horario
      </p>
    </div>
  )
}
