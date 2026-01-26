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
      bosplan_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_active: boolean
          mime_type: string | null
          name: string
          template_type: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_active?: boolean
          mime_type?: string | null
          name: string
          template_type?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_active?: boolean
          mime_type?: string | null
          name?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          activity_number: string
          assigned_to: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          organization_id: string
          priority: string
          status: string
          subject: string
          type: string | null
          updated_at: string
        }
        Insert: {
          activity_number: string
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id: string
          priority?: string
          status?: string
          subject: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          activity_number?: string
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string
          priority?: string
          status?: string
          subject?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_cases: {
        Row: {
          assigned_to: string | null
          case_number: string
          case_origin: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          email: string | null
          id: string
          organization_id: string
          phone: string | null
          priority: string
          product_name: string | null
          reported_by: string | null
          status: string
          subject: string
          type: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          case_number: string
          case_origin?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          email?: string | null
          id?: string
          organization_id: string
          phone?: string | null
          priority?: string
          product_name?: string | null
          reported_by?: string | null
          status?: string
          subject: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          case_number?: string
          case_origin?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          email?: string | null
          id?: string
          organization_id?: string
          phone?: string | null
          priority?: string
          product_name?: string | null
          reported_by?: string | null
          status?: string
          subject?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_cases_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_meetings: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          end_time: string
          id: string
          meeting_number: string
          meeting_venue: string | null
          organization_id: string
          start_time: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          end_time: string
          id?: string
          meeting_number: string
          meeting_venue?: string | null
          organization_id: string
          start_time: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          end_time?: string
          id?: string
          meeting_number?: string
          meeting_venue?: string | null
          organization_id?: string
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_meetings_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meetings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meetings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          additional_info: string | null
          address: string | null
          company_name: string
          contact_name: string | null
          created_at: string
          email: string
          enquiry_source: string | null
          first_name: string | null
          id: string
          last_name: string | null
          mobile: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          additional_info?: string | null
          address?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string
          email: string
          enquiry_source?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          additional_info?: string | null
          address?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string
          email?: string
          enquiry_source?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_room_activity: {
        Row: {
          action: string
          created_at: string
          data_room_id: string
          details: Json | null
          id: string
          is_guest: boolean
          organization_id: string
          user_email: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string
          data_room_id: string
          details?: Json | null
          id?: string
          is_guest?: boolean
          organization_id: string
          user_email: string
          user_id?: string | null
          user_name: string
        }
        Update: {
          action?: string
          created_at?: string
          data_room_id?: string
          details?: Json | null
          id?: string
          is_guest?: boolean
          organization_id?: string
          user_email?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_room_activity_data_room_id_fkey"
            columns: ["data_room_id"]
            isOneToOne: false
            referencedRelation: "data_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_activity_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_room_document_content: {
        Row: {
          content: string
          content_type: string
          created_at: string
          data_room_id: string
          file_id: string
          id: string
          last_edited_by: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          content_type?: string
          created_at?: string
          data_room_id: string
          file_id: string
          id?: string
          last_edited_by?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string
          data_room_id?: string
          file_id?: string
          id?: string
          last_edited_by?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_room_document_content_data_room_id_fkey"
            columns: ["data_room_id"]
            isOneToOne: false
            referencedRelation: "data_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_document_content_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: true
            referencedRelation: "data_room_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_document_content_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_document_content_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_room_document_presence: {
        Row: {
          cursor_position: number | null
          file_id: string
          id: string
          last_seen_at: string
          user_id: string
        }
        Insert: {
          cursor_position?: number | null
          file_id: string
          id?: string
          last_seen_at?: string
          user_id: string
        }
        Update: {
          cursor_position?: number | null
          file_id?: string
          id?: string
          last_seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_room_document_presence_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "data_room_files"
            referencedColumns: ["id"]
          },
        ]
      }
      data_room_document_versions: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          data_room_id: string
          document_id: string
          file_id: string
          id: string
          organization_id: string
          version_note: string | null
          version_number: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          data_room_id: string
          document_id: string
          file_id: string
          id?: string
          organization_id: string
          version_note?: string | null
          version_number?: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          data_room_id?: string
          document_id?: string
          file_id?: string
          id?: string
          organization_id?: string
          version_note?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "data_room_document_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_document_versions_data_room_id_fkey"
            columns: ["data_room_id"]
            isOneToOne: false
            referencedRelation: "data_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "data_room_document_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_document_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "data_room_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_document_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_room_file_comments: {
        Row: {
          comment: string
          commenter_email: string
          commenter_id: string | null
          commenter_name: string
          created_at: string
          data_room_id: string
          file_id: string
          id: string
          is_guest: boolean
          organization_id: string
        }
        Insert: {
          comment: string
          commenter_email: string
          commenter_id?: string | null
          commenter_name: string
          created_at?: string
          data_room_id: string
          file_id: string
          id?: string
          is_guest?: boolean
          organization_id: string
        }
        Update: {
          comment?: string
          commenter_email?: string
          commenter_id?: string | null
          commenter_name?: string
          created_at?: string
          data_room_id?: string
          file_id?: string
          id?: string
          is_guest?: boolean
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_room_file_comments_commenter_id_fkey"
            columns: ["commenter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_file_comments_data_room_id_fkey"
            columns: ["data_room_id"]
            isOneToOne: false
            referencedRelation: "data_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_file_comments_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "data_room_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_file_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_room_file_permissions: {
        Row: {
          created_at: string
          file_id: string
          guest_invite_id: string | null
          id: string
          permission_level: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          file_id: string
          guest_invite_id?: string | null
          id?: string
          permission_level?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          file_id?: string
          guest_invite_id?: string | null
          id?: string
          permission_level?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_room_file_permissions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "data_room_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_file_permissions_guest_invite_id_fkey"
            columns: ["guest_invite_id"]
            isOneToOne: false
            referencedRelation: "data_room_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_file_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_room_files: {
        Row: {
          created_at: string
          data_room_id: string | null
          deleted_at: string | null
          file_path: string
          file_size: number
          folder_id: string | null
          guest_uploaded_by: string | null
          id: string
          is_restricted: boolean
          mime_type: string | null
          name: string
          organization_id: string
          permission: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          data_room_id?: string | null
          deleted_at?: string | null
          file_path: string
          file_size?: number
          folder_id?: string | null
          guest_uploaded_by?: string | null
          id?: string
          is_restricted?: boolean
          mime_type?: string | null
          name: string
          organization_id: string
          permission?: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          data_room_id?: string | null
          deleted_at?: string | null
          file_path?: string
          file_size?: number
          folder_id?: string | null
          guest_uploaded_by?: string | null
          id?: string
          is_restricted?: boolean
          mime_type?: string | null
          name?: string
          organization_id?: string
          permission?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_room_files_data_room_id_fkey"
            columns: ["data_room_id"]
            isOneToOne: false
            referencedRelation: "data_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "data_room_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_files_guest_uploaded_by_fkey"
            columns: ["guest_uploaded_by"]
            isOneToOne: false
            referencedRelation: "data_room_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_room_folder_permissions: {
        Row: {
          created_at: string
          folder_id: string
          guest_invite_id: string | null
          id: string
          permission_level: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          folder_id: string
          guest_invite_id?: string | null
          id?: string
          permission_level?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          folder_id?: string
          guest_invite_id?: string | null
          id?: string
          permission_level?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_room_folder_permissions_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "data_room_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_folder_permissions_guest_invite_id_fkey"
            columns: ["guest_invite_id"]
            isOneToOne: false
            referencedRelation: "data_room_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_folder_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_room_folders: {
        Row: {
          created_at: string
          created_by: string
          data_room_id: string
          deleted_at: string | null
          id: string
          is_restricted: boolean
          name: string
          organization_id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          data_room_id: string
          deleted_at?: string | null
          id?: string
          is_restricted?: boolean
          name: string
          organization_id: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          data_room_id?: string
          deleted_at?: string | null
          id?: string
          is_restricted?: boolean
          name?: string
          organization_id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_room_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_folders_data_room_id_fkey"
            columns: ["data_room_id"]
            isOneToOne: false
            referencedRelation: "data_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_folders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "data_room_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      data_room_invites: {
        Row: {
          access_id: string | null
          created_at: string
          data_room_id: string | null
          email: string
          expires_at: string
          guest_name: string | null
          id: string
          invited_by: string
          nda_signed_at: string | null
          organization_id: string
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          access_id?: string | null
          created_at?: string
          data_room_id?: string | null
          email: string
          expires_at?: string
          guest_name?: string | null
          id?: string
          invited_by: string
          nda_signed_at?: string | null
          organization_id: string
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          access_id?: string | null
          created_at?: string
          data_room_id?: string | null
          email?: string
          expires_at?: string
          guest_name?: string | null
          id?: string
          invited_by?: string
          nda_signed_at?: string | null
          organization_id?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_room_invites_data_room_id_fkey"
            columns: ["data_room_id"]
            isOneToOne: false
            referencedRelation: "data_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_room_members: {
        Row: {
          added_by: string | null
          created_at: string
          data_room_id: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          data_room_id: string
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          data_room_id?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_room_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_members_data_room_id_fkey"
            columns: ["data_room_id"]
            isOneToOne: false
            referencedRelation: "data_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_room_messages: {
        Row: {
          created_at: string
          data_room_id: string
          id: string
          is_guest: boolean
          message: string
          organization_id: string
          sender_email: string
          sender_id: string | null
          sender_name: string
        }
        Insert: {
          created_at?: string
          data_room_id: string
          id?: string
          is_guest?: boolean
          message: string
          organization_id: string
          sender_email: string
          sender_id?: string | null
          sender_name: string
        }
        Update: {
          created_at?: string
          data_room_id?: string
          id?: string
          is_guest?: boolean
          message?: string
          organization_id?: string
          sender_email?: string
          sender_id?: string | null
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_room_messages_data_room_id_fkey"
            columns: ["data_room_id"]
            isOneToOne: false
            referencedRelation: "data_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_room_nda_signatures: {
        Row: {
          created_at: string
          data_room_id: string
          id: string
          invite_id: string | null
          ip_address: string | null
          nda_content_hash: string
          signature_url: string | null
          signed_at: string
          signer_email: string
          signer_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data_room_id: string
          id?: string
          invite_id?: string | null
          ip_address?: string | null
          nda_content_hash: string
          signature_url?: string | null
          signed_at?: string
          signer_email: string
          signer_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data_room_id?: string
          id?: string
          invite_id?: string | null
          ip_address?: string | null
          nda_content_hash?: string
          signature_url?: string | null
          signed_at?: string
          signer_email?: string
          signer_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_room_nda_signatures_data_room_id_fkey"
            columns: ["data_room_id"]
            isOneToOne: false
            referencedRelation: "data_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_nda_signatures_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "data_room_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      data_rooms: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          nda_content: string | null
          nda_content_hash: string | null
          nda_required: boolean
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          nda_content?: string | null
          nda_content_hash?: string | null
          nda_required?: boolean
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          nda_content?: string | null
          nda_content_hash?: string | null
          nda_required?: boolean
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_rooms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dataroom_storage_purchases: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          organization_id: string
          price_id: string
          status: string
          storage_gb: number
          stripe_session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          organization_id: string
          price_id: string
          status?: string
          storage_gb: number
          stripe_session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          organization_id?: string
          price_id?: string
          status?: string
          storage_gb?: number
          stripe_session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataroom_storage_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_document_content: {
        Row: {
          content: string
          content_type: string
          created_at: string
          file_id: string
          id: string
          last_edited_by: string | null
          updated_at: string
        }
        Insert: {
          content?: string
          content_type?: string
          created_at?: string
          file_id: string
          id?: string
          last_edited_by?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string
          file_id?: string
          id?: string
          last_edited_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_document_content_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: true
            referencedRelation: "drive_files"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_document_presence: {
        Row: {
          cursor_position: number | null
          file_id: string
          id: string
          last_seen_at: string
          user_id: string
        }
        Insert: {
          cursor_position?: number | null
          file_id: string
          id?: string
          last_seen_at?: string
          user_id: string
        }
        Update: {
          cursor_position?: number | null
          file_id?: string
          id?: string
          last_seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_document_presence_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "drive_files"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_document_versions: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          document_id: string
          file_id: string
          id: string
          version_note: string | null
          version_number: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          document_id: string
          file_id: string
          id?: string
          version_note?: string | null
          version_number?: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          document_id?: string
          file_id?: string
          id?: string
          version_note?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "drive_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "drive_document_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_document_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "drive_files"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_file_access: {
        Row: {
          created_at: string
          file_id: string
          granted_by: string
          granted_to: string
          id: string
        }
        Insert: {
          created_at?: string
          file_id: string
          granted_by: string
          granted_to: string
          id?: string
        }
        Update: {
          created_at?: string
          file_id?: string
          granted_by?: string
          granted_to?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_file_access_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "drive_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_file_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_file_access_granted_to_fkey"
            columns: ["granted_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_file_shares: {
        Row: {
          created_at: string
          file_id: string
          id: string
          is_link_share: boolean
          link_expires_at: string | null
          organization_id: string
          permission: string
          share_token: string | null
          shared_by: string
          shared_with: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_id: string
          id?: string
          is_link_share?: boolean
          link_expires_at?: string | null
          organization_id: string
          permission?: string
          share_token?: string | null
          shared_by: string
          shared_with?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_id?: string
          id?: string
          is_link_share?: boolean
          link_expires_at?: string | null
          organization_id?: string
          permission?: string
          share_token?: string | null
          shared_by?: string
          shared_with?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_file_shares_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "drive_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_file_shares_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_file_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_file_shares_shared_with_fkey"
            columns: ["shared_with"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_files: {
        Row: {
          assigned_to: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          file_category: string | null
          file_path: string
          file_size: number
          folder_id: string | null
          id: string
          is_restricted: boolean | null
          last_viewed_at: string | null
          mime_type: string | null
          name: string
          organization_id: string
          parent_file_id: string | null
          requires_signature: boolean | null
          signature_status: string | null
          signed_at: string | null
          signed_by: string | null
          status: string
          updated_at: string
          uploaded_by: string
          version: number
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          file_category?: string | null
          file_path: string
          file_size?: number
          folder_id?: string | null
          id?: string
          is_restricted?: boolean | null
          last_viewed_at?: string | null
          mime_type?: string | null
          name: string
          organization_id: string
          parent_file_id?: string | null
          requires_signature?: boolean | null
          signature_status?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: string
          updated_at?: string
          uploaded_by: string
          version?: number
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          file_category?: string | null
          file_path?: string
          file_size?: number
          folder_id?: string | null
          id?: string
          is_restricted?: boolean | null
          last_viewed_at?: string | null
          mime_type?: string | null
          name?: string
          organization_id?: string
          parent_file_id?: string | null
          requires_signature?: boolean | null
          signature_status?: string | null
          signed_at?: string | null
          signed_by?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "drive_files_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "drive_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_files_parent_file_id_fkey"
            columns: ["parent_file_id"]
            isOneToOne: false
            referencedRelation: "drive_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_files_signed_by_fkey"
            columns: ["signed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_folders: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          organization_id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          organization_id: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          organization_id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_folders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "drive_folders"
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
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feature_category: string
          feature_name: string
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feature_category?: string
          feature_name?: string
          id?: string
          organization_id?: string | null
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
      helpdesk_response_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          organization_id: string
          response_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id: string
          response_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          response_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_response_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_response_attachments_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_ticket_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_response_templates: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_response_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_settings: {
        Row: {
          business_hours_end: string | null
          business_hours_start: string | null
          company_name: string | null
          created_at: string
          id: string
          logo_url: string | null
          organization_id: string
          portal_enabled: boolean | null
          portal_slug: string | null
          primary_color: string | null
          secondary_color: string | null
          show_attachment_field: boolean | null
          show_details_field: boolean | null
          show_email_field: boolean | null
          show_name_field: boolean | null
          show_phone_field: boolean | null
          support_email: string | null
          support_phone: string | null
          timezone: string | null
          updated_at: string
          working_days: string[] | null
        }
        Insert: {
          business_hours_end?: string | null
          business_hours_start?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          organization_id: string
          portal_enabled?: boolean | null
          portal_slug?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_attachment_field?: boolean | null
          show_details_field?: boolean | null
          show_email_field?: boolean | null
          show_name_field?: boolean | null
          show_phone_field?: boolean | null
          support_email?: string | null
          support_phone?: string | null
          timezone?: string | null
          updated_at?: string
          working_days?: string[] | null
        }
        Update: {
          business_hours_end?: string | null
          business_hours_start?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          organization_id?: string
          portal_enabled?: boolean | null
          portal_slug?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_attachment_field?: boolean | null
          show_details_field?: boolean | null
          show_email_field?: boolean | null
          show_name_field?: boolean | null
          show_phone_field?: boolean | null
          support_email?: string | null
          support_phone?: string | null
          timezone?: string | null
          updated_at?: string
          working_days?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_ticket_responses: {
        Row: {
          content: string
          created_at: string
          email_sent: boolean | null
          id: string
          organization_id: string
          sent_at: string
          sent_by: string | null
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          email_sent?: boolean | null
          id?: string
          organization_id: string
          sent_at?: string
          sent_by?: string | null
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          email_sent?: boolean | null
          id?: string
          organization_id?: string
          sent_at?: string
          sent_by?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_ticket_responses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "helpdesk_ticket_responses_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "helpdesk_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_tickets: {
        Row: {
          assigned_to: string | null
          attachment_name: string | null
          attachment_url: string | null
          channel: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          details: string | null
          id: string
          organization_id: string
          status: string
          subject: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          channel?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          details?: string | null
          id?: string
          organization_id: string
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          channel?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          details?: string | null
          id?: string
          organization_id?: string
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          discount: number
          discount_type: string
          id: string
          invoice_id: string
          position: number
          quantity: number
          rate: number
          vat: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          discount?: number
          discount_type?: string
          id?: string
          invoice_id: string
          position?: number
          quantity?: number
          rate?: number
          vat?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          discount?: number
          discount_type?: string
          id?: string
          invoice_id?: string
          position?: number
          quantity?: number
          rate?: number
          vat?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          organization_id: string
          payment_date: string
          payment_method: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          organization_id: string
          payment_date?: string
          payment_method: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          organization_id?: string
          payment_date?: string
          payment_method?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_products: {
        Row: {
          created_at: string
          default_rate: number
          default_vat: string
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_rate?: number
          default_vat?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_rate?: number
          default_vat?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_settings: {
        Row: {
          business_address: string | null
          business_email: string | null
          business_name: string | null
          business_phone: string | null
          business_website: string | null
          created_at: string
          currency: string | null
          default_payment_terms: string | null
          enable_reminders: boolean | null
          financial_year_start: string | null
          footer_note: string | null
          id: string
          invoice_prefix: string | null
          location: string | null
          logo_url: string | null
          max_reminders: number | null
          organization_id: string
          primary_color: string | null
          reminder_after_due: number | null
          reminder_before_due: number | null
          reminder_on_due: boolean | null
          secondary_color: string | null
          show_logo: boolean | null
          show_payment_terms: boolean | null
          show_tax_number: boolean | null
          tax_label: string | null
          tax_number: string | null
          tax_rate: number | null
          terms_and_conditions_url: string | null
          updated_at: string
        }
        Insert: {
          business_address?: string | null
          business_email?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_website?: string | null
          created_at?: string
          currency?: string | null
          default_payment_terms?: string | null
          enable_reminders?: boolean | null
          financial_year_start?: string | null
          footer_note?: string | null
          id?: string
          invoice_prefix?: string | null
          location?: string | null
          logo_url?: string | null
          max_reminders?: number | null
          organization_id: string
          primary_color?: string | null
          reminder_after_due?: number | null
          reminder_before_due?: number | null
          reminder_on_due?: boolean | null
          secondary_color?: string | null
          show_logo?: boolean | null
          show_payment_terms?: boolean | null
          show_tax_number?: boolean | null
          tax_label?: string | null
          tax_number?: string | null
          tax_rate?: number | null
          terms_and_conditions_url?: string | null
          updated_at?: string
        }
        Update: {
          business_address?: string | null
          business_email?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_website?: string | null
          created_at?: string
          currency?: string | null
          default_payment_terms?: string | null
          enable_reminders?: boolean | null
          financial_year_start?: string | null
          footer_note?: string | null
          id?: string
          invoice_prefix?: string | null
          location?: string | null
          logo_url?: string | null
          max_reminders?: number | null
          organization_id?: string
          primary_color?: string | null
          reminder_after_due?: number | null
          reminder_before_due?: number | null
          reminder_on_due?: boolean | null
          secondary_color?: string | null
          show_logo?: boolean | null
          show_payment_terms?: boolean | null
          show_tax_number?: boolean | null
          tax_label?: string | null
          tax_number?: string | null
          tax_rate?: number | null
          terms_and_conditions_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string
          currency: string
          customer_id: string | null
          customer_notes: string | null
          description: string | null
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_number: string
          organization_id: string
          paid_at: string | null
          pdf_url: string | null
          period_end: string | null
          period_start: string | null
          status: string
          stripe_invoice_id: string | null
          terms: string | null
          terms_conditions: string | null
          updated_at: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          customer_notes?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number: string
          organization_id: string
          paid_at?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_invoice_id?: string | null
          terms?: string | null
          terms_conditions?: string | null
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          customer_notes?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          organization_id?: string
          paid_at?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_invoice_id?: string | null
          terms?: string | null
          terms_conditions?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          organization_id: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          organization_id: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          organization_id?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_dataroom_storage: {
        Row: {
          additional_storage_gb: number
          created_at: string
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          additional_storage_gb?: number
          created_at?: string
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          additional_storage_gb?: number
          created_at?: string
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_dataroom_storage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
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
      organization_storage: {
        Row: {
          additional_storage_gb: number
          created_at: string
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          additional_storage_gb?: number
          created_at?: string
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          additional_storage_gb?: number
          created_at?: string
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_storage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
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
          icon: string | null
          id: string
          is_completed: boolean
          position: number
          priority: string | null
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
          icon?: string | null
          id?: string
          is_completed?: boolean
          position?: number
          priority?: string | null
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
          icon?: string | null
          id?: string
          is_completed?: boolean
          position?: number
          priority?: string | null
          project_id?: string | null
          time_group?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_checklist_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          created_at: string
          created_by: string | null
          current_version: number
          description: string | null
          effective_date: string | null
          expiry_date: string | null
          file_id: string | null
          id: string
          organization_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_version?: number
          description?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          file_id?: string | null
          id?: string
          organization_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_version?: number
          description?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          file_id?: string | null
          id?: string
          organization_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "drive_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_tag_assignments: {
        Row: {
          created_at: string
          id: string
          policy_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          policy_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          policy_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_tag_assignments_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "policy_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_versions: {
        Row: {
          change_notes: string | null
          created_at: string
          created_by: string | null
          file_id: string | null
          id: string
          policy_id: string
          version_number: number
        }
        Insert: {
          change_notes?: string | null
          created_at?: string
          created_by?: string | null
          file_id?: string | null
          id?: string
          policy_id: string
          version_number: number
        }
        Update: {
          change_notes?: string | null
          created_at?: string
          created_by?: string | null
          file_id?: string | null
          id?: string
          policy_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "policy_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "drive_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_versions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
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
      project_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string | null
          organization_id: string
          project_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          mime_type?: string | null
          organization_id: string
          project_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string | null
          organization_id?: string
          project_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archived_at: string | null
          assigned_user_id: string | null
          created_at: string
          created_by_user_id: string | null
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
          assigned_user_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
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
          assigned_user_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
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
            foreignKeyName: "projects_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      storage_purchases: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          organization_id: string
          price_id: string
          status: string
          storage_gb: number
          stripe_session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          organization_id: string
          price_id: string
          status?: string
          storage_gb: number
          stripe_session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          organization_id?: string
          price_id?: string
          status?: string
          storage_gb?: number
          stripe_session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          base_user_count: number
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          plan_type: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          base_user_count?: number
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          base_user_count?: number
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admin_orgs: {
        Row: {
          created_at: string
          id: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "super_admin_orgs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
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
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string | null
          organization_id: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          mime_type?: string | null
          organization_id: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string | null
          organization_id?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_merge_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          merge_type: string
          organization_id: string
          performed_by: string
          reverted_at: string | null
          source_user_id: string
          status: string
          target_user_id: string
          task_count: number
          tasks_transferred: Json
          temporary_end_date: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          merge_type: string
          organization_id: string
          performed_by: string
          reverted_at?: string | null
          source_user_id: string
          status?: string
          target_user_id: string
          task_count?: number
          tasks_transferred?: Json
          temporary_end_date?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          merge_type?: string
          organization_id?: string
          performed_by?: string
          reverted_at?: string | null
          source_user_id?: string
          status?: string
          target_user_id?: string
          task_count?: number
          tasks_transferred?: Json
          temporary_end_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_merge_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_merge_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_merge_logs_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_merge_logs_target_user_id_fkey"
            columns: ["target_user_id"]
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
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          organization_id: string
          task_id: string
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          organization_id?: string
          task_id?: string
          updated_at?: string
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
      task_urls: {
        Row: {
          created_at: string
          created_by: string
          id: string
          organization_id: string
          task_id: string
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          organization_id: string
          task_id: string
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          task_id?: string
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_urls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_urls_task_id_fkey"
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
          assignment_responded_at: string | null
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
          assignment_responded_at?: string | null
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
          assignment_responded_at?: string | null
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
      team_working_hours: {
        Row: {
          created_at: string
          friday_hours: number | null
          id: string
          monday_hours: number | null
          organization_id: string
          saturday_hours: number | null
          sunday_hours: number | null
          thursday_hours: number | null
          tuesday_hours: number | null
          updated_at: string
          user_id: string
          wednesday_hours: number | null
        }
        Insert: {
          created_at?: string
          friday_hours?: number | null
          id?: string
          monday_hours?: number | null
          organization_id: string
          saturday_hours?: number | null
          sunday_hours?: number | null
          thursday_hours?: number | null
          tuesday_hours?: number | null
          updated_at?: string
          user_id: string
          wednesday_hours?: number | null
        }
        Update: {
          created_at?: string
          friday_hours?: number | null
          id?: string
          monday_hours?: number | null
          organization_id?: string
          saturday_hours?: number | null
          sunday_hours?: number | null
          thursday_hours?: number | null
          tuesday_hours?: number | null
          updated_at?: string
          user_id?: string
          wednesday_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_working_hours_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_working_hours_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_documents: {
        Row: {
          created_at: string
          drive_file_id: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          template_id: string
          template_version_id: string
        }
        Insert: {
          created_at?: string
          drive_file_id?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          template_id: string
          template_version_id: string
        }
        Update: {
          created_at?: string
          drive_file_id?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          template_id?: string
          template_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_documents_drive_file_id_fkey"
            columns: ["drive_file_id"]
            isOneToOne: false
            referencedRelation: "drive_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_documents_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      template_folders: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          icon: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_folders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      template_tasks: {
        Row: {
          created_at: string
          default_board: string | null
          description: string | null
          icon: string | null
          id: string
          position: number
          priority: string | null
          template_id: string
          template_version_id: string
          title: string
        }
        Insert: {
          created_at?: string
          default_board?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          position?: number
          priority?: string | null
          template_id: string
          template_version_id: string
          title: string
        }
        Update: {
          created_at?: string
          default_board?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          position?: number
          priority?: string | null
          template_id?: string
          template_version_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_tasks_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      template_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          template_id: string
          version_note: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          template_id: string
          version_note?: string | null
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          template_id?: string
          version_note?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          category: Database["public"]["Enums"]["template_category"]
          created_at: string
          created_by: string
          description: string | null
          folder_id: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          template_type: Database["public"]["Enums"]["template_type"]
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["template_category"]
          created_at?: string
          created_by: string
          description?: string | null
          folder_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          template_type: Database["public"]["Enums"]["template_type"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["template_category"]
          created_at?: string
          created_by?: string
          description?: string | null
          folder_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          template_type?: Database["public"]["Enums"]["template_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "template_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_appearance_settings: {
        Row: {
          brand_coral: string | null
          brand_green: string | null
          brand_orange: string | null
          brand_teal: string | null
          created_at: string
          drive_file_text_size: number
          id: string
          project_card_text_size: number
          secondary_background: string | null
          secondary_foreground: string | null
          status_complete_bg: string | null
          status_in_progress_bg: string | null
          status_todo_bg: string | null
          task_card_text_size: number
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_coral?: string | null
          brand_green?: string | null
          brand_orange?: string | null
          brand_teal?: string | null
          created_at?: string
          drive_file_text_size?: number
          id?: string
          project_card_text_size?: number
          secondary_background?: string | null
          secondary_foreground?: string | null
          status_complete_bg?: string | null
          status_in_progress_bg?: string | null
          status_todo_bg?: string | null
          task_card_text_size?: number
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_coral?: string | null
          brand_green?: string | null
          brand_orange?: string | null
          brand_teal?: string | null
          created_at?: string
          drive_file_text_size?: number
          id?: string
          project_card_text_size?: number
          secondary_background?: string | null
          secondary_foreground?: string | null
          status_complete_bg?: string | null
          status_in_progress_bg?: string | null
          status_todo_bg?: string | null
          task_card_text_size?: number
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_signatures: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          signature_data: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          signature_data: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          signature_data?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      va_pricing: {
        Row: {
          hours_package: number
          id: string
          price_cents: number
          stripe_price_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          hours_package: number
          id?: string
          price_cents: number
          stripe_price_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          hours_package?: number
          id?: string
          price_cents?: number
          stripe_price_id?: string
          updated_at?: string
          updated_by?: string | null
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
      accept_invite:
        | {
            Args: {
              _full_name: string
              _job_role: string
              _phone_number: string
              _token: string
              _user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              _full_name: string
              _job_role: string
              _phone_number: string
              _token: string
              _user_id: string
            }
            Returns: Json
          }
      calculate_nda_hash: { Args: { content: string }; Returns: string }
      check_ai_usage_allowed: { Args: { org_id: string }; Returns: boolean }
      check_expired_policies: { Args: never; Returns: undefined }
      cleanup_data_room_deleted_items: { Args: never; Returns: undefined }
      cleanup_deleted_tasks: { Args: never; Returns: undefined }
      cleanup_expired_notifications: { Args: never; Returns: undefined }
      cleanup_scheduled_deletions: { Args: never; Returns: undefined }
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
      create_additional_organization: {
        Args: {
          _employee_size: string
          _job_role: string
          _org_name: string
          _phone_number: string
        }
        Returns: string
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
      generate_access_id: { Args: never; Returns: string }
      generate_case_number: { Args: never; Returns: string }
      generate_helpdesk_ticket_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_meeting_number: { Args: never; Returns: string }
      generate_org_slug: { Args: { org_name: string }; Returns: string }
      get_data_room_organization_id: {
        Args: { p_data_room_id: string }
        Returns: string
      }
      get_helpdesk_by_slug: {
        Args: { _slug: string }
        Returns: {
          company_name: string
          id: string
          logo_url: string
          organization_id: string
          portal_enabled: boolean
          primary_color: string
          secondary_color: string
          show_attachment_field: boolean
          show_details_field: boolean
          show_email_field: boolean
          show_name_field: boolean
          show_phone_field: boolean
        }[]
      }
      get_invite_by_token: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          org_name: string
          org_slug: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }[]
      }
      get_task_organization_id: { Args: { _task_id: string }; Returns: string }
      get_user_organization_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ai_usage: { Args: { org_id: string }; Returns: boolean }
      is_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_assigned_to_task: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
      is_file_owner: {
        Args: { _file_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_viewer: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_org_by_slug: {
        Args: { _slug: string }
        Returns: {
          id: string
          logo_url: string
          name: string
          slug: string
        }[]
      }
      submit_helpdesk_ticket: {
        Args: {
          _attachment_name?: string
          _attachment_url?: string
          _contact_email?: string
          _contact_name?: string
          _contact_phone?: string
          _details?: string
          _organization_id: string
          _subject: string
        }
        Returns: string
      }
      user_can_access_data_room: {
        Args: { p_data_room_id: string }
        Returns: boolean
      }
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
      app_role: "admin" | "member" | "viewer" | "super_admin"
      template_category: "operations" | "strategic" | "product" | "general"
      template_type: "task" | "document"
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
      app_role: ["admin", "member", "viewer", "super_admin"],
      template_category: ["operations", "strategic", "product", "general"],
      template_type: ["task", "document"],
    },
  },
} as const
