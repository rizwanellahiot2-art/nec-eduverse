export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      academic_assessments: {
        Row: {
          assessment_date: string
          class_section_id: string
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          max_marks: number
          published_at: string | null
          school_id: string
          subject_id: string | null
          teacher_user_id: string | null
          term_label: string | null
          title: string
        }
        Insert: {
          assessment_date?: string
          class_section_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          max_marks?: number
          published_at?: string | null
          school_id: string
          subject_id?: string | null
          teacher_user_id?: string | null
          term_label?: string | null
          title: string
        }
        Update: {
          assessment_date?: string
          class_section_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          max_marks?: number
          published_at?: string | null
          school_id?: string
          subject_id?: string | null
          teacher_user_id?: string | null
          term_label?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_assessments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_classes: {
        Row: {
          created_at: string
          created_by: string | null
          grade_level: number | null
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          grade_level?: number | null
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          grade_level?: number | null
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_messages: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          school_id: string
          sender_user_id: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          school_id: string
          sender_user_id: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          school_id?: string
          sender_user_id?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_notifications: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          read_at: string | null
          school_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          school_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          school_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          attachment_urls: string[] | null
          created_at: string
          days_late: number | null
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          marks_before_penalty: number | null
          marks_obtained: number | null
          penalty_applied: number | null
          school_id: string
          status: string
          student_id: string
          submission_text: string | null
          submitted_at: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          attachment_urls?: string[] | null
          created_at?: string
          days_late?: number | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          marks_before_penalty?: number | null
          marks_obtained?: number | null
          penalty_applied?: number | null
          school_id: string
          status?: string
          student_id: string
          submission_text?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          attachment_urls?: string[] | null
          created_at?: string
          days_late?: number | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          marks_before_penalty?: number | null
          marks_obtained?: number | null
          penalty_applied?: number | null
          school_id?: string
          status?: string
          student_id?: string
          submission_text?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_fee_ledger"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          allow_late_submissions: boolean | null
          assignment_type: string
          attachment_urls: string[] | null
          class_section_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          late_penalty_percent_per_day: number | null
          max_late_penalty_percent: number | null
          max_marks: number
          school_id: string
          status: string
          teacher_user_id: string
          title: string
          updated_at: string
          weightage: number
        }
        Insert: {
          allow_late_submissions?: boolean | null
          assignment_type?: string
          attachment_urls?: string[] | null
          class_section_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          late_penalty_percent_per_day?: number | null
          max_late_penalty_percent?: number | null
          max_marks?: number
          school_id: string
          status?: string
          teacher_user_id: string
          title: string
          updated_at?: string
          weightage?: number
        }
        Update: {
          allow_late_submissions?: boolean | null
          assignment_type?: string
          attachment_urls?: string[] | null
          class_section_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          late_penalty_percent_per_day?: number | null
          max_late_penalty_percent?: number | null
          max_marks?: number
          school_id?: string
          status?: string
          teacher_user_id?: string
          title?: string
          updated_at?: string
          weightage?: number
        }
        Relationships: []
      }
      attendance_entries: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          school_id: string
          session_id: string
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          school_id: string
          session_id: string
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          school_id?: string
          session_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_fee_ledger"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "attendance_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          class_section_id: string
          created_at: string
          created_by: string | null
          id: string
          period_label: string
          school_id: string
          session_date: string
        }
        Insert: {
          class_section_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          period_label?: string
          school_id: string
          session_date: string
        }
        Update: {
          class_section_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          period_label?: string
          school_id?: string
          session_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          school_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          school_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_shared_with_parents: boolean
          note_type: string
          school_id: string
          student_id: string
          teacher_user_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_shared_with_parents?: boolean
          note_type?: string
          school_id: string
          student_id: string
          teacher_user_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_shared_with_parents?: boolean
          note_type?: string
          school_id?: string
          student_id?: string
          teacher_user_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_section_subjects: {
        Row: {
          class_section_id: string
          created_at: string
          created_by: string | null
          id: string
          school_id: string
          subject_id: string
        }
        Insert: {
          class_section_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          school_id: string
          subject_id: string
        }
        Update: {
          class_section_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          school_id?: string
          subject_id?: string
        }
        Relationships: []
      }
      class_sections: {
        Row: {
          class_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          room: string | null
          school_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          room?: string | null
          school_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          room?: string | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sections_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "academic_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sections_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          activity_type: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          lead_id: string
          school_id: string
          summary: string
        }
        Insert: {
          activity_type: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          lead_id: string
          school_id: string
          summary: string
        }
        Update: {
          activity_type?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string
          school_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_call_logs: {
        Row: {
          called_at: string
          created_at: string
          created_by: string | null
          duration_seconds: number
          id: string
          lead_id: string
          notes: string | null
          outcome: string
          school_id: string
        }
        Insert: {
          called_at?: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number
          id?: string
          lead_id: string
          notes?: string | null
          outcome?: string
          school_id: string
        }
        Update: {
          called_at?: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number
          id?: string
          lead_id?: string
          notes?: string | null
          outcome?: string
          school_id?: string
        }
        Relationships: []
      }
      crm_campaigns: {
        Row: {
          budget: number
          channel: string
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          name: string
          school_id: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number
          channel?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          name: string
          school_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number
          channel?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          name?: string
          school_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_lead_attributions: {
        Row: {
          attributed_at: string
          campaign_id: string
          created_by: string | null
          id: string
          lead_id: string
          school_id: string
        }
        Insert: {
          attributed_at?: string
          campaign_id: string
          created_by?: string | null
          id?: string
          lead_id: string
          school_id: string
        }
        Update: {
          attributed_at?: string
          campaign_id?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          school_id?: string
        }
        Relationships: []
      }
      crm_leads: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          next_follow_up_at: string | null
          notes: string | null
          phone: string | null
          pipeline_id: string
          school_id: string
          score: number
          source: string | null
          stage_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          pipeline_id: string
          school_id: string
          score?: number
          source?: string | null
          stage_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          pipeline_id?: string
          school_id?: string
          score?: number
          source?: string | null
          stage_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipelines_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_stages: {
        Row: {
          created_at: string
          id: string
          name: string
          pipeline_id: string
          school_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pipeline_id: string
          school_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pipeline_id?: string
          school_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_stages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_plan_installments: {
        Row: {
          amount: number
          created_at: string
          due_day: number | null
          fee_plan_id: string
          id: string
          label: string
          school_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_day?: number | null
          fee_plan_id: string
          id?: string
          label: string
          school_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_day?: number | null
          fee_plan_id?: string
          id?: string
          label?: string
          school_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_plan_installments_fee_plan_id_fkey"
            columns: ["fee_plan_id"]
            isOneToOne: false
            referencedRelation: "fee_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_plans: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          school_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          payment_method_id: string | null
          reference: string | null
          school_id: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          payment_method_id?: string | null
          reference?: string | null
          school_id: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          payment_method_id?: string | null
          reference?: string | null
          school_id?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_expenses_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "finance_payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_invoice_items: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          label: string
          qty: number
          school_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          label: string
          qty?: number
          school_id: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          label?: string
          qty?: number
          school_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "finance_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_invoices: {
        Row: {
          created_at: string
          created_by: string | null
          discount_total: number
          due_date: string | null
          id: string
          invoice_no: string
          issue_date: string
          late_fee_total: number
          notes: string | null
          school_id: string
          status: string
          student_id: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount_total?: number
          due_date?: string | null
          id?: string
          invoice_no: string
          issue_date?: string
          late_fee_total?: number
          notes?: string | null
          school_id: string
          status?: string
          student_id: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount_total?: number
          due_date?: string | null
          id?: string
          invoice_no?: string
          issue_date?: string
          late_fee_total?: number
          notes?: string | null
          school_id?: string
          status?: string
          student_id?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_fee_ledger"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "finance_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_payment_methods: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          instructions: string | null
          is_active: boolean
          name: string
          school_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          name: string
          school_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          name?: string
          school_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          method_id: string | null
          notes: string | null
          paid_at: string
          received_by: string | null
          reference: string | null
          school_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          method_id?: string | null
          notes?: string | null
          paid_at?: string
          received_by?: string | null
          reference?: string | null
          school_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          method_id?: string | null
          notes?: string | null
          paid_at?: string
          received_by?: string | null
          reference?: string | null
          school_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "finance_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payments_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "finance_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_fee_ledger"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "finance_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_thresholds: {
        Row: {
          created_at: string
          created_by: string | null
          grade_label: string
          grade_points: number | null
          id: string
          max_percentage: number
          min_percentage: number
          school_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          grade_label: string
          grade_points?: number | null
          id?: string
          max_percentage: number
          min_percentage: number
          school_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          grade_label?: string
          grade_points?: number | null
          id?: string
          max_percentage?: number
          min_percentage?: number
          school_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      homework: {
        Row: {
          attachment_urls: string[] | null
          class_section_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          id: string
          school_id: string
          status: string
          teacher_user_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attachment_urls?: string[] | null
          class_section_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          id?: string
          school_id: string
          status?: string
          teacher_user_id: string
          title: string
          updated_at?: string
        }
        Update: {
          attachment_urls?: string[] | null
          class_section_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          id?: string
          school_id?: string
          status?: string
          teacher_user_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hr_contracts: {
        Row: {
          contract_type: string
          created_at: string
          created_by: string | null
          department: string | null
          document_url: string | null
          end_date: string | null
          id: string
          position: string | null
          school_id: string
          start_date: string
          status: string
          terms: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_type?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          position?: string | null
          school_id: string
          start_date: string
          status?: string
          terms?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_type?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          position?: string | null
          school_id?: string
          start_date?: string
          status?: string
          terms?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_contracts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_documents: {
        Row: {
          created_at: string
          created_by: string | null
          document_name: string
          document_type: string
          file_url: string
          id: string
          notes: string | null
          school_id: string
          updated_at: string
          uploaded_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_name: string
          document_type: string
          file_url: string
          id?: string
          notes?: string | null
          school_id: string
          updated_at?: string
          uploaded_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_name?: string
          document_type?: string
          file_url?: string
          id?: string
          notes?: string | null
          school_id?: string
          updated_at?: string
          uploaded_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_documents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_leave_balances: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          leave_type_id: string
          remaining_days: number
          school_id: string
          total_days: number
          updated_at: string
          used_days: number
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          leave_type_id: string
          remaining_days?: number
          school_id: string
          total_days?: number
          updated_at?: string
          used_days?: number
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          leave_type_id?: string
          remaining_days?: number
          school_id?: string
          total_days?: number
          updated_at?: string
          used_days?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "hr_leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "hr_leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_leave_balances_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_leave_requests: {
        Row: {
          created_at: string
          created_by: string | null
          days_count: number
          end_date: string
          id: string
          leave_type_id: string
          notes: string | null
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days_count: number
          end_date: string
          id?: string
          leave_type_id: string
          notes?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days_count?: number
          end_date?: string
          id?: string
          leave_type_id?: string
          notes?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "hr_leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_leave_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_leave_types: {
        Row: {
          created_at: string
          created_by: string | null
          days_per_year: number
          id: string
          is_active: boolean
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days_per_year?: number
          id?: string
          is_active?: boolean
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days_per_year?: number
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_leave_types_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_pay_runs: {
        Row: {
          created_at: string
          created_by: string | null
          deductions: number
          gross_amount: number
          id: string
          net_amount: number
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          period_end: string
          period_start: string
          school_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deductions?: number
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          period_end: string
          period_start: string
          school_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deductions?: number
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          period_end?: string
          period_start?: string
          school_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_pay_runs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_performance_reviews: {
        Row: {
          areas_for_improvement: string | null
          created_at: string
          created_by: string | null
          goals: string | null
          id: string
          notes: string | null
          rating: number | null
          review_period_end: string
          review_period_start: string
          reviewer_user_id: string
          school_id: string
          status: string
          strengths: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          areas_for_improvement?: string | null
          created_at?: string
          created_by?: string | null
          goals?: string | null
          id?: string
          notes?: string | null
          rating?: number | null
          review_period_end: string
          review_period_start: string
          reviewer_user_id: string
          school_id: string
          status?: string
          strengths?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          areas_for_improvement?: string | null
          created_at?: string
          created_by?: string | null
          goals?: string | null
          id?: string
          notes?: string | null
          rating?: number | null
          review_period_end?: string
          review_period_start?: string
          reviewer_user_id?: string
          school_id?: string
          status?: string
          strengths?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_performance_reviews_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_salary_records: {
        Row: {
          allowances: number | null
          base_salary: number
          created_at: string
          created_by: string | null
          currency: string
          deductions: number | null
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          pay_frequency: string
          school_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowances?: number | null
          base_salary?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          deductions?: number | null
          effective_from: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          pay_frequency?: string
          school_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowances?: number | null
          base_salary?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          deductions?: number | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          pay_frequency?: string
          school_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_salary_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_staff_attendance: {
        Row: {
          attendance_date: string
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          recorded_by: string | null
          school_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attendance_date: string
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          recorded_by?: string | null
          school_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attendance_date?: string
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          recorded_by?: string | null
          school_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_staff_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plans: {
        Row: {
          class_section_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          objectives: string | null
          period_label: string | null
          plan_date: string
          resources: string | null
          school_id: string
          status: string
          subject_id: string | null
          teacher_user_id: string
          topic: string
          updated_at: string
        }
        Insert: {
          class_section_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          objectives?: string | null
          period_label?: string | null
          plan_date: string
          resources?: string | null
          school_id: string
          status?: string
          subject_id?: string | null
          teacher_user_id: string
          topic: string
          updated_at?: string
        }
        Update: {
          class_section_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          objectives?: string | null
          period_label?: string | null
          plan_date?: string
          resources?: string | null
          school_id?: string
          status?: string
          subject_id?: string | null
          teacher_user_id?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plans_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_messages: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_read: boolean
          parent_message_id: string | null
          read_at: string | null
          recipient_user_id: string
          school_id: string
          sender_user_id: string
          student_id: string
          subject: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          parent_message_id?: string | null
          read_at?: string | null
          recipient_user_id: string
          school_id: string
          sender_user_id: string
          student_id: string
          subject?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          parent_message_id?: string | null
          read_at?: string | null
          recipient_user_id?: string
          school_id?: string
          sender_user_id?: string
          student_id?: string
          subject?: string | null
        }
        Relationships: []
      }
      parent_notification_preferences: {
        Row: {
          created_at: string
          id: string
          low_grade_threshold: number | null
          notify_absent: boolean
          notify_grades: boolean
          notify_homework: boolean
          notify_late: boolean
          school_id: string
          student_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          low_grade_threshold?: number | null
          notify_absent?: boolean
          notify_grades?: boolean
          notify_homework?: boolean
          notify_late?: boolean
          school_id: string
          student_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          low_grade_threshold?: number | null
          notify_absent?: boolean
          notify_grades?: boolean
          notify_homework?: boolean
          notify_late?: boolean
          school_id?: string
          student_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_notification_preferences_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_notification_preferences_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_fee_ledger"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "parent_notification_preferences_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_notifications: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_read: boolean
          notification_type: string
          parent_user_id: string
          read_at: string | null
          school_id: string
          student_id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          notification_type?: string
          parent_user_id: string
          read_at?: string | null
          school_id: string
          student_id: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          notification_type?: string
          parent_user_id?: string
          read_at?: string | null
          school_id?: string
          student_id?: string
          title?: string
        }
        Relationships: []
      }
      platform_super_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      salary_budget_targets: {
        Row: {
          budget_amount: number
          created_at: string
          created_by: string | null
          department: string | null
          fiscal_year: number
          id: string
          notes: string | null
          role: string | null
          school_id: string
          updated_at: string
        }
        Insert: {
          budget_amount?: number
          created_at?: string
          created_by?: string | null
          department?: string | null
          fiscal_year: number
          id?: string
          notes?: string | null
          role?: string | null
          school_id: string
          updated_at?: string
        }
        Update: {
          budget_amount?: number
          created_at?: string
          created_by?: string | null
          department?: string | null
          fiscal_year?: number
          id?: string
          notes?: string | null
          role?: string | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_budget_targets_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_alert_settings: {
        Row: {
          attendance_critical_threshold: number
          attendance_warning_threshold: number
          created_at: string
          pending_invoices_threshold: number
          school_id: string
          support_ticket_hours: number
          updated_at: string
        }
        Insert: {
          attendance_critical_threshold?: number
          attendance_warning_threshold?: number
          created_at?: string
          pending_invoices_threshold?: number
          school_id: string
          support_ticket_hours?: number
          updated_at?: string
        }
        Update: {
          attendance_critical_threshold?: number
          attendance_warning_threshold?: number
          created_at?: string
          pending_invoices_threshold?: number
          school_id?: string
          support_ticket_hours?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_alert_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_bootstrap: {
        Row: {
          bootstrapped_at: string | null
          bootstrapped_by: string | null
          created_at: string
          locked: boolean
          school_id: string
          updated_at: string
        }
        Insert: {
          bootstrapped_at?: string | null
          bootstrapped_by?: string | null
          created_at?: string
          locked?: boolean
          school_id: string
          updated_at?: string
        }
        Update: {
          bootstrapped_at?: string | null
          bootstrapped_by?: string | null
          created_at?: string
          locked?: boolean
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_bootstrap_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_branding: {
        Row: {
          accent_hue: number
          accent_lightness: number
          accent_saturation: number
          created_at: string
          logo_url: string | null
          radius_scale: number
          school_id: string
          updated_at: string
        }
        Insert: {
          accent_hue?: number
          accent_lightness?: number
          accent_saturation?: number
          created_at?: string
          logo_url?: string | null
          radius_scale?: number
          school_id: string
          updated_at?: string
        }
        Update: {
          accent_hue?: number
          accent_lightness?: number
          accent_saturation?: number
          created_at?: string
          logo_url?: string | null
          radius_scale?: number
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_branding_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_memberships: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          school_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          school_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          school_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_memberships_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_user_directory: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          school_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          school_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          school_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_user_directory_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_certificates: {
        Row: {
          certificate_type: string
          created_at: string
          created_by: string | null
          file_url: string
          id: string
          issued_at: string
          school_id: string
          student_id: string
          title: string
        }
        Insert: {
          certificate_type?: string
          created_at?: string
          created_by?: string | null
          file_url: string
          id?: string
          issued_at?: string
          school_id: string
          student_id: string
          title: string
        }
        Update: {
          certificate_type?: string
          created_at?: string
          created_by?: string | null
          file_url?: string
          id?: string
          issued_at?: string
          school_id?: string
          student_id?: string
          title?: string
        }
        Relationships: []
      }
      student_enrollments: {
        Row: {
          class_section_id: string
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          school_id: string
          start_date: string
          student_id: string
        }
        Insert: {
          class_section_id: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          school_id: string
          start_date?: string
          student_id: string
        }
        Update: {
          class_section_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          school_id?: string
          start_date?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_fee_ledger"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fee_accounts: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string | null
          fee_plan_id: string
          id: string
          school_id: string
          start_date: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          fee_plan_id: string
          id?: string
          school_id: string
          start_date?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          fee_plan_id?: string
          id?: string
          school_id?: string
          start_date?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fee_accounts_fee_plan_id_fkey"
            columns: ["fee_plan_id"]
            isOneToOne: false
            referencedRelation: "fee_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_accounts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_fee_ledger"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_fee_accounts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_guardians: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          is_emergency_contact: boolean
          is_primary: boolean
          phone: string | null
          relationship: string
          school_id: string
          student_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_emergency_contact?: boolean
          is_primary?: boolean
          phone?: string | null
          relationship?: string
          school_id: string
          student_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_emergency_contact?: boolean
          is_primary?: boolean
          phone?: string | null
          relationship?: string
          school_id?: string
          student_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      student_marks: {
        Row: {
          assessment_id: string
          computed_grade: string | null
          created_by: string | null
          grade_points: number | null
          graded_at: string
          graded_by: string | null
          id: string
          marks: number | null
          remarks: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          assessment_id: string
          computed_grade?: string | null
          created_by?: string | null
          grade_points?: number | null
          graded_at?: string
          graded_by?: string | null
          id?: string
          marks?: number | null
          remarks?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          assessment_id?: string
          computed_grade?: string | null
          created_by?: string | null
          grade_points?: number | null
          graded_at?: string
          graded_by?: string | null
          id?: string
          marks?: number | null
          remarks?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: []
      }
      student_results: {
        Row: {
          assignment_id: string
          created_at: string
          created_by: string | null
          grade: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          marks_obtained: number | null
          remarks: string | null
          school_id: string
          student_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          created_by?: string | null
          grade?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          marks_obtained?: number | null
          remarks?: string | null
          school_id: string
          student_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          created_by?: string | null
          grade?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          marks_obtained?: number | null
          remarks?: string | null
          school_id?: string
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          first_name: string
          id: string
          last_name: string | null
          parent_name: string | null
          profile_id: string | null
          school_id: string
          status: string
          student_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          parent_name?: string | null
          profile_id?: string | null
          school_id: string
          status?: string
          student_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          parent_name?: string | null
          profile_id?: string | null
          school_id?: string
          status?: string
          student_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          school_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          school_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          school_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          created_by: string | null
          id: string
          school_id: string
          sender_user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          school_id: string
          sender_user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          school_id?: string
          sender_user_id?: string
        }
        Relationships: []
      }
      teacher_assignments: {
        Row: {
          class_section_id: string
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean
          school_id: string
          teacher_user_id: string
        }
        Insert: {
          class_section_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          school_id: string
          teacher_user_id: string
        }
        Update: {
          class_section_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          school_id?: string
          teacher_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_period_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          notes: string | null
          school_id: string
          status: string
          teacher_user_id: string
          timetable_entry_id: string
          topics_covered: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          school_id: string
          status?: string
          teacher_user_id: string
          timetable_entry_id: string
          topics_covered?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          school_id?: string
          status?: string
          teacher_user_id?: string
          timetable_entry_id?: string
          topics_covered?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_period_logs_timetable_entry_id_fkey"
            columns: ["timetable_entry_id"]
            isOneToOne: false
            referencedRelation: "timetable_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_subject_assignments: {
        Row: {
          class_section_id: string
          created_at: string
          created_by: string | null
          id: string
          school_id: string
          subject_id: string
          teacher_user_id: string
          updated_at: string
        }
        Insert: {
          class_section_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          school_id: string
          subject_id: string
          teacher_user_id: string
          updated_at?: string
        }
        Update: {
          class_section_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          school_id?: string
          subject_id?: string
          teacher_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      timetable_entries: {
        Row: {
          class_section_id: string
          created_at: string
          created_by: string | null
          day_of_week: number
          end_time: string
          id: string
          is_published: boolean
          period_id: string | null
          published_at: string | null
          room: string | null
          school_id: string
          start_time: string
          subject_name: string
          teacher_user_id: string | null
          updated_at: string
        }
        Insert: {
          class_section_id: string
          created_at?: string
          created_by?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_published?: boolean
          period_id?: string | null
          published_at?: string | null
          room?: string | null
          school_id: string
          start_time: string
          subject_name: string
          teacher_user_id?: string | null
          updated_at?: string
        }
        Update: {
          class_section_id?: string
          created_at?: string
          created_by?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_published?: boolean
          period_id?: string | null
          published_at?: string | null
          room?: string | null
          school_id?: string
          start_time?: string
          subject_name?: string
          teacher_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "timetable_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_periods: {
        Row: {
          created_by: string | null
          end_time: string | null
          id: string
          is_break: boolean
          label: string
          school_id: string
          sort_order: number
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_by?: string | null
          end_time?: string | null
          id?: string
          is_break?: boolean
          label: string
          school_id: string
          sort_order?: number
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_by?: string | null
          end_time?: string | null
          id?: string
          is_break?: boolean
          label?: string
          school_id?: string
          sort_order?: number
          start_time?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      student_fee_ledger: {
        Row: {
          first_name: string | null
          invoice_count: number | null
          last_name: string | null
          outstanding_balance: number | null
          overdue_amount: number | null
          overdue_count: number | null
          payment_count: number | null
          school_id: string | null
          student_code: string | null
          student_id: string | null
          total_invoiced: number | null
          total_paid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_grade: {
        Args: { p_percentage: number; p_school_id: string }
        Returns: {
          grade_label: string
          grade_points: number
        }[]
      }
      can_manage_finance: { Args: { _school_id: string }; Returns: boolean }
      can_manage_hr: { Args: { _school_id: string }; Returns: boolean }
      can_manage_staff: { Args: { _school_id: string }; Returns: boolean }
      can_manage_students: { Args: { _school_id: string }; Returns: boolean }
      can_work_crm: { Args: { _school_id: string }; Returns: boolean }
      directory_search: {
        Args: {
          _entity?: string
          _limit?: number
          _offset?: number
          _q?: string
          _school_id: string
          _status?: string
        }
        Returns: {
          created_at: string
          entity: string
          id: string
          status: string
          subtitle: string
          title: string
          total_count: number
        }[]
      }
      ensure_default_crm_pipeline: {
        Args: { _school_id: string }
        Returns: undefined
      }
      get_at_risk_students: {
        Args: { _class_section_id?: string; _school_id: string }
        Returns: {
          attendance_rate: number
          avg_grade_percentage: number
          class_section_id: string
          first_name: string
          is_at_risk: boolean
          last_name: string
          recent_grade_avg: number
          risk_reason: string
          school_id: string
          student_id: string
          total_sessions: number
        }[]
      }
      get_school_public_by_slug: {
        Args: { _slug: string }
        Returns: {
          id: string
          is_active: boolean
          name: string
          slug: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _school_id: string
        }
        Returns: boolean
      }
      is_my_child: {
        Args: { _school_id: string; _student_id: string }
        Returns: boolean
      }
      is_my_student: {
        Args: { _school_id: string; _student_id: string }
        Returns: boolean
      }
      is_platform_super_admin: { Args: never; Returns: boolean }
      is_school_member: { Args: { _school_id: string }; Returns: boolean }
      is_super_admin: { Args: { _school_id: string }; Returns: boolean }
      is_teacher_assigned: {
        Args: { _class_section_id: string; _school_id: string }
        Returns: boolean
      }
      list_school_user_profiles: {
        Args: { _school_id: string }
        Returns: {
          display_name: string
          email: string
          profile_id: string
          user_id: string
        }[]
      }
      my_children: { Args: { _school_id: string }; Returns: string[] }
      my_student_id: { Args: { _school_id: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "school_owner"
        | "principal"
        | "vice_principal"
        | "academic_coordinator"
        | "teacher"
        | "accountant"
        | "hr_manager"
        | "counselor"
        | "student"
        | "parent"
        | "marketing_staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "school_owner",
        "principal",
        "vice_principal",
        "academic_coordinator",
        "teacher",
        "accountant",
        "hr_manager",
        "counselor",
        "student",
        "parent",
        "marketing_staff",
      ],
    },
  },
} as const
