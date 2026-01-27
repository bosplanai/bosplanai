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
      ai_usage_limits: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          limit_type: string
          max_prompts: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          limit_type: string
          max_prompts?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          limit_type?: string
          max_prompts?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage_tracking: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          period_end: string
          period_start: string
          period_type: string
          prompt_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          period_type: string
          prompt_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          prompt_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_tracking_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_usage_logs: {
        Row: {
          created_at: string
          feature_category: string
          feature_name: string
          id: string
          organization_id: string | null
          page_path: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feature_category?: string
          feature_name: string
          id?: string
          organization_id?: string | null
          page_path?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feature_category?: string
          feature_name?: string
          id?: string
          organization_id?: string | null
          page_path?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_usage_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_specialist_plans: {
        Row: {
          agreed_at: string | null
          agreed_to_terms: boolean
          created_at: string
          expires_at: string
          id: string
          organization_id: string
          plan_id: string
          referral_code: string | null
        }
        Insert: {
          agreed_at?: string | null
          agreed_to_terms?: boolean
          created_at?: string
          expires_at: string
          id?: string
          organization_id: string
          plan_id: string
          referral_code?: string | null
        }
        Update: {
          agreed_at?: string | null
          agreed_to_terms?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          organization_id?: string
          plan_id?: string
          referral_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_specialist_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_specialist_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "specialist_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          employee_size: string
          id: string
          is_suspended: boolean
          logo_url: string | null
          name: string
          scheduled_deletion_at: string | null
          slug: string
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_size: string
          id?: string
          is_suspended?: boolean
          logo_url?: string | null
          name: string
          scheduled_deletion_at?: string | null
          slug: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_size?: string
          id?: string
          is_suspended?: boolean
          logo_url?: string | null
          name?: string
          scheduled_deletion_at?: string | null
          slug?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_checklist_items: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          created_at: string
          description: string | null
          due_date: string | null
          icon: string
          id: string
          is_completed: boolean
          position: number
          priority: string
          project_id: string | null
          time_group: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          icon?: string
          id?: string
          is_completed?: boolean
          position?: number
          priority?: string
          project_id?: string | null
          time_group?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          icon?: string
          id?: string
          is_completed?: boolean
          position?: number
          priority?: string
          project_id?: string | null
          time_group?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_virtual_assistant: boolean
          job_role: string
          onboarding_completed: boolean
          organization_id: string
          phone_number: string
          scheduled_deletion_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_virtual_assistant?: boolean
          job_role: string
          onboarding_completed?: boolean
          organization_id: string
          phone_number: string
          scheduled_deletion_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_virtual_assistant?: boolean
          job_role?: string
          onboarding_completed?: boolean
          organization_id?: string
          phone_number?: string
          scheduled_deletion_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          organization_id: string | null
          position: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string | null
          position?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string | null
          position?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_links: {
        Row: {
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          name: string
          plan_id: string
          referral_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          name: string
          plan_id: string
          referral_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          name?: string
          plan_id?: string
          referral_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_links_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "specialist_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_plans: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          duration_months: number
          id: string
          is_active: boolean
          max_users: number | null
          name: string
          registration_code: string
          terms_and_conditions: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_months: number
          id?: string
          is_active?: boolean
          max_users?: number | null
          name: string
          registration_code: string
          terms_and_conditions?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_months?: number
          id?: string
          is_active?: boolean
          max_users?: number | null
          name?: string
          registration_code?: string
          terms_and_conditions?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          organization_id: string
          task_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          organization_id: string
          task_id: string
          user_id: string
          user_name: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          organization_id?: string
          task_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived_at: string | null
          assigned_user_id: string | null
          assignment_status: string
          attachment_name: string | null
          attachment_url: string | null
          category: string
          completed_at: string | null
          created_at: string
          created_by_user_id: string | null
          decline_reason: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          icon: string
          id: string
          is_draft: boolean
          is_recurring: boolean
          last_reminder_sent_at: string | null
          organization_id: string | null
          position: number
          priority: string
          project_id: string | null
          status: string
          subcategory: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          assigned_user_id?: string | null
          assignment_status?: string
          attachment_name?: string | null
          attachment_url?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          decline_reason?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          icon?: string
          id?: string
          is_draft?: boolean
          is_recurring?: boolean
          last_reminder_sent_at?: string | null
          organization_id?: string | null
          position?: number
          priority?: string
          project_id?: string | null
          status?: string
          subcategory?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          assigned_user_id?: string | null
          assignment_status?: string
          attachment_name?: string | null
          attachment_url?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          decline_reason?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          icon?: string
          id?: string
          is_draft?: boolean
          is_recurring?: boolean
          last_reminder_sent_at?: string | null
          organization_id?: string | null
          position?: number
          priority?: string
          project_id?: string | null
          status?: string
          subcategory?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      va_pricing: {
        Row: {
          created_at: string
          hours_package: number
          id: string
          is_active: boolean
          price_cents: number
          stripe_price_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hours_package: number
          id?: string
          is_active?: boolean
          price_cents: number
          stripe_price_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hours_package?: number
          id?: string
          is_active?: boolean
          price_cents?: number
          stripe_price_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      virtual_assistants: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          first_name: string
          id: string
          job_role: string
          last_name: string
          organization_id: string | null
          phone_number: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          first_name: string
          id?: string
          job_role: string
          last_name: string
          organization_id?: string | null
          phone_number?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          first_name?: string
          id?: string
          job_role?: string
          last_name?: string
          organization_id?: string | null
          phone_number?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "virtual_assistants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      feature_usage_stats: {
        Row: {
          feature_category: string | null
          feature_name: string | null
          first_used_at: string | null
          last_used_at: string | null
          total_visits: number | null
          unique_organizations: number | null
          unique_users: number | null
          visits_last_24h: number | null
          visits_last_30d: number | null
          visits_last_7d: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_ai_usage_allowed: { Args: { org_id: string }; Returns: boolean }
      complete_specialist_signup: {
        Args: {
          _employee_size: string
          _full_name: string
          _job_role: string
          _org_name: string
          _phone_number: string
          _referral_code: string
          _user_id: string
        }
        Returns: Json
      }
      create_organization_and_profile: {
        Args: {
          _employee_size: string
          _full_name: string
          _job_role: string
          _org_name: string
          _phone_number: string
          _user_id: string
        }
        Returns: string
      }
      generate_org_slug: { Args: { org_name: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ai_usage: { Args: { org_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      validate_referral_code: {
        Args: { code: string }
        Returns: {
          error_message: string
          is_valid: boolean
          link_id: string
          plan_duration_months: number
          plan_id: string
          plan_max_users: number
          plan_name: string
          plan_terms: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "super_admin"
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
      app_role: ["admin", "moderator", "user", "super_admin"],
    },
  },
} as const
