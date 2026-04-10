export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          invite_token: string
          admin_invite_token: string | null
          owner_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          invite_token?: string
          admin_invite_token?: string | null
          owner_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          invite_token?: string
          admin_invite_token?: string | null
          owner_id?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          name: string
          role: 'admin' | 'employee'
          company_id: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          name: string
          role?: 'admin' | 'employee'
          company_id?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: 'admin' | 'employee'
          company_id?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      work_areas: {
        Row: {
          id: string
          name: string
          access_type: 'employees' | 'admins_only'
          company_id: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          access_type?: 'employees' | 'admins_only'
          company_id: string
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          access_type?: 'employees' | 'admins_only'
          company_id?: string
          order_index?: number
          created_at?: string
        }
      }
      shifts: {
        Row: {
          id: string
          name: string
          start_time: string
          area_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          start_time: string
          area_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          start_time?: string
          area_id?: string
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          area_id: string
          priority: 'high' | 'medium' | 'low'
          is_recurring: boolean
          specific_date: string | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          area_id: string
          priority?: 'high' | 'medium' | 'low'
          is_recurring?: boolean
          specific_date?: string | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          area_id?: string
          priority?: 'high' | 'medium' | 'low'
          is_recurring?: boolean
          specific_date?: string | null
          order_index?: number
          created_at?: string
        }
      }
      task_completions: {
        Row: {
          id: string
          task_id: string
          user_id: string
          shift_id: string | null
          status: 'pending' | 'in_progress' | 'completed'
          completed_at: string | null
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          shift_id?: string | null
          status?: 'pending' | 'in_progress' | 'completed'
          completed_at?: string | null
          date?: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          shift_id?: string | null
          status?: 'pending' | 'in_progress' | 'completed'
          completed_at?: string | null
          date?: string
          created_at?: string
        }
      }
      user_areas: {
        Row: {
          id: string
          user_id: string
          area_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          area_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          area_id?: string
          created_at?: string
        }
      }
    }
    Functions: {
      get_active_shift: {
        Args: { p_area_id: string }
        Returns: string | null
      }
    }
  }
}

// Tipos derivados convenientes
export type Company = Database['public']['Tables']['companies']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type WorkArea = Database['public']['Tables']['work_areas']['Row'] & { widgets?: string[] }
export type Shift = Database['public']['Tables']['shifts']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskCompletion = Database['public']['Tables']['task_completions']['Row']
export type UserArea = Database['public']['Tables']['user_areas']['Row']

export type TaskStatus = 'pending' | 'in_progress' | 'completed'
export type TaskPriority = 'high' | 'medium' | 'low'
export type UserRole = 'admin' | 'employee'
export type AreaAccessType = 'employees' | 'admins_only'
export type WorkspaceWidget = 'tasks' | 'calendar' | 'notes'

export interface WorkspaceEvent {
  id: string
  area_id: string
  title: string
  date: string
  description: string | null
  color: string
  created_by: string | null
  created_at: string
}

export interface WorkspaceNote {
  id: string
  area_id: string
  content: string
  updated_by: string | null
  updated_at: string
  created_at: string
}
