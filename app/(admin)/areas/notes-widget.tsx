'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StickyNote, Check, Loader2 } from 'lucide-react'

interface Props {
  areaId: string
  userId: string
}

export function NotesWidget({ areaId, userId }: Props) {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [content, setContent] = useState('')
  const [noteId, setNoteId] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('workspace_notes')
        .select('*')
        .eq('area_id', areaId)
        .single()

      if (data) {
        setContent(data.content)
        setNoteId(data.id)
      } else {
        setContent('')
        setNoteId(null)
      }
      setLoading(false)
    }
    load()
  }, [areaId])

  const saveNote = useCallback(async (text: string) => {
    setStatus('saving')
    if (noteId) {
      await supabase
        .from('workspace_notes')
        .update({ content: text, updated_by: userId, updated_at: new Date().toISOString() })
        .eq('id', noteId)
    } else {
      const { data } = await supabase
        .from('workspace_notes')
        .insert({ area_id: areaId, content: text, updated_by: userId })
        .select('id')
        .single()
      if (data) setNoteId(data.id)
    }
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2000)
  }, [noteId, areaId, userId])

  function handleChange(val: string) {
    setContent(val)
    setStatus('idle')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => saveNote(val), 1500)
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 flex flex-col" style={{ minHeight: 320 }}>
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <StickyNote size={15} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-gray-100">Anotador</h3>
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-1">
          {status === 'saving' && <><Loader2 size={11} className="animate-spin" /> Guardando...</>}
          {status === 'saved' && <><Check size={11} className="text-green-400" /> Guardado</>}
        </div>
      </div>
      <div className="flex-1 p-3">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={18} className="animate-spin text-gray-600" />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={e => handleChange(e.target.value)}
            placeholder="Escribí notas, ideas, recordatorios..."
            className="w-full h-full min-h-[240px] resize-none bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none leading-relaxed"
          />
        )}
      </div>
    </div>
  )
}
