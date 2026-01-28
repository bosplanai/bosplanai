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
          file_size: number
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
          file_size?: number
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
          file_size?: number
          id?: string
          is_active?: boolean
          mime_type?: string | null
          name?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bosplan_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          created_by: string | null
          file_id: string
          id: string
          permission_level: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_id: string
          id?: string
          permission_level?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_id?: string
          id?: string
          permission_level?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_room_file_permissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_file_permissions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "data_room_files"
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
          data_room_id: string
          deleted_at: string | null
          file_path: string
          file_size: number
          folder_id: string | null
          id: string
          is_restricted: boolean
          mime_type: string | null
          name: string
          organization_id: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          data_room_id: string
          deleted_at?: string | null
          file_path: string
          file_size?: number
          folder_id?: string | null
          id?: string
          is_restricted?: boolean
          mime_type?: string | null
          name: string
          organization_id: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          data_room_id?: string
          deleted_at?: string | null
          file_path?: string
          file_size?: number
          folder_id?: string | null
          id?: string
          is_restricted?: boolean
          mime_type?: string | null
          name?: string
          organization_id?: string
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
          created_by: string | null
          folder_id: string
          id: string
          permission_level: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          folder_id: string
          id?: string
          permission_level?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          folder_id?: string
          id?: string
          permission_level?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_room_folder_permissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_folder_permissions_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "data_room_folders"
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
          access_password: string | null
          created_at: string
          data_room_id: string
          email: string
          expires_at: string
          guest_name: string | null
          id: string
          invited_by: string | null
          nda_signed_at: string | null
          organization_id: string
          status: string
        }
        Insert: {
          access_id?: string | null
          access_password?: string | null
          created_at?: string
          data_room_id: string
          email: string
          expires_at?: string
          guest_name?: string | null
          id?: string
          invited_by?: string | null
          nda_signed_at?: string | null
          organization_id: string
          status?: string
        }
        Update: {
          access_id?: string | null
          access_password?: string | null
          created_at?: string
          data_room_id?: string
          email?: string
          expires_at?: string
          guest_name?: string | null
          id?: string
          invited_by?: string | null
          nda_signed_at?: string | null
          organization_id?: string
          status?: string
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
          created_at: string
          created_by: string | null
          data_room_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_room_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_room_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_room_members_created_by_fkey"
            columns: ["created_by"]
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
          data_room_id: string
          id: string
          ip_address: string | null
          nda_content_hash: string | null
          signed_at: string
          signer_email: string
          signer_name: string
          user_id: string | null
        }
        Insert: {
          data_room_id: string
          id?: string
          ip_address?: string | null
          nda_content_hash?: string | null
          signed_at?: string
          signer_email: string
          signer_name: string
          user_id?: string | null
        }
        Update: {
          data_room_id?: string
          id?: string
          ip_address?: string | null
          nda_content_hash?: string | null
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
            foreignKeyName: "data_room_nda_signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          organization_id: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          organization_id?: string
          parent_id?: string | null
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
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
        Relationships: [
          {
            foreignKeyName: "personal_checklist_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          {
            foreignKeyName: "task_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "task_urls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      user_appearance_settings: {
        Row: {
          brand_coral: string | null
          brand_green: string | null
          brand_orange: string | null
          brand_teal: string | null
          created_at: string
          drive_file_text_size: number | null
          id: string
          project_card_text_size: number | null
          secondary_background: string | null
          secondary_foreground: string | null
          status_complete_bg: string | null
          status_in_progress_bg: string | null
          status_todo_bg: string | null
          task_card_text_size: number | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_coral?: string | null
          brand_green?: string | null
          brand_orange?: string | null
          brand_teal?: string | null
          created_at?: string
          drive_file_text_size?: number | null
          id?: string
          project_card_text_size?: number | null
          secondary_background?: string | null
          secondary_foreground?: string | null
          status_complete_bg?: string | null
          status_in_progress_bg?: string | null
          status_todo_bg?: string | null
          task_card_text_size?: number | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_coral?: string | null
          brand_green?: string | null
          brand_orange?: string | null
          brand_teal?: string | null
          created_at?: string
          drive_file_text_size?: number | null
          id?: string
          project_card_text_size?: number | null
          secondary_background?: string | null
          secondary_foreground?: string | null
          status_complete_bg?: string | null
          status_in_progress_bg?: string | null
          status_todo_bg?: string | null
          task_card_text_size?: number | null
          theme?: string | null
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
      accept_invite: {
        Args: {
          _full_name: string
          _job_role: string
          _phone_number: string
          _token: string
          _user_id: string
        }
        Returns: Json
      }
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
      get_invite_by_token: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          invited_by_name: string
          org_name: string
          org_slug: string
          organization_id: string
          role: string
          status: string
          token: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ai_usage: { Args: { org_id: string }; Returns: boolean }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
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
