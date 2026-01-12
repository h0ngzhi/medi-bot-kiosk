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
      clinic_hours_cache: {
        Row: {
          clinic_id: string
          clinic_name: string
          fetched_at: string
          hours: string | null
          id: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          clinic_name: string
          fetched_at?: string
          hours?: string | null
          id?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          clinic_name?: string
          fetched_at?: string
          hours?: string | null
          id?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_programmes: {
        Row: {
          admin_email: string | null
          category: string | null
          conducted_by: string | null
          contact_number: string | null
          created_at: string
          current_signups: number | null
          description: string | null
          duration: string | null
          event_date: string | null
          event_time: string | null
          group_size: string | null
          guest_option: string | null
          id: string
          is_active: boolean
          is_online: boolean | null
          languages: string[] | null
          learning_objectives: string[] | null
          location: string | null
          max_capacity: number | null
          online_link: string | null
          points_reward: number
          recurrence_type: string | null
          region: string | null
          serial_id: string | null
          series_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          admin_email?: string | null
          category?: string | null
          conducted_by?: string | null
          contact_number?: string | null
          created_at?: string
          current_signups?: number | null
          description?: string | null
          duration?: string | null
          event_date?: string | null
          event_time?: string | null
          group_size?: string | null
          guest_option?: string | null
          id?: string
          is_active?: boolean
          is_online?: boolean | null
          languages?: string[] | null
          learning_objectives?: string[] | null
          location?: string | null
          max_capacity?: number | null
          online_link?: string | null
          points_reward?: number
          recurrence_type?: string | null
          region?: string | null
          serial_id?: string | null
          series_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          admin_email?: string | null
          category?: string | null
          conducted_by?: string | null
          contact_number?: string | null
          created_at?: string
          current_signups?: number | null
          description?: string | null
          duration?: string | null
          event_date?: string | null
          event_time?: string | null
          group_size?: string | null
          guest_option?: string | null
          id?: string
          is_active?: boolean
          is_online?: boolean | null
          languages?: string[] | null
          learning_objectives?: string[] | null
          location?: string | null
          max_capacity?: number | null
          online_link?: string | null
          points_reward?: number
          recurrence_type?: string | null
          region?: string | null
          serial_id?: string | null
          series_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dashboard_slideshow: {
        Row: {
          created_at: string
          display_order: number
          duration_seconds: number
          id: string
          is_active: boolean
          media_type: string
          media_url: string
          position: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          duration_seconds?: number
          id?: string
          is_active?: boolean
          media_type: string
          media_url: string
          position?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          duration_seconds?: number
          id?: string
          is_active?: boolean
          media_type?: string
          media_url?: string
          position?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      health_screenings: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          kiosk_user_id: string
          location: string | null
          scheduled_date: string | null
          status: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kiosk_user_id: string
          location?: string | null
          scheduled_date?: string | null
          status?: string
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kiosk_user_id?: string
          location?: string | null
          scheduled_date?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_screenings_kiosk_user_id_fkey"
            columns: ["kiosk_user_id"]
            isOneToOne: false
            referencedRelation: "kiosk_users"
            referencedColumns: ["id"]
          },
        ]
      }
      idle_slideshow: {
        Row: {
          created_at: string
          display_order: number
          duration_seconds: number
          id: string
          is_active: boolean
          media_type: string
          media_url: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          duration_seconds?: number
          id?: string
          is_active?: boolean
          media_type: string
          media_url: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          duration_seconds?: number
          id?: string
          is_active?: boolean
          media_type?: string
          media_url?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kiosk_users: {
        Row: {
          chas_card_type: string | null
          created_at: string
          events_attended: number
          id: string
          name: string
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          chas_card_type?: string | null
          created_at?: string
          events_attended?: number
          id?: string
          name: string
          points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          chas_card_type?: string | null
          created_at?: string
          events_attended?: number
          id?: string
          name?: string
          points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medications: {
        Row: {
          collection_clinic: string | null
          created_at: string
          delivery_date: string | null
          delivery_method: string | null
          delivery_status: string
          dosage: string | null
          id: string
          is_current: boolean
          kiosk_user_id: string
          name: string
          order_completed_at: string | null
          payment_method: string | null
          price_per_box: number | null
          subsidy_percent: number | null
          tablets_per_box: number | null
          total_paid: number | null
        }
        Insert: {
          collection_clinic?: string | null
          created_at?: string
          delivery_date?: string | null
          delivery_method?: string | null
          delivery_status?: string
          dosage?: string | null
          id?: string
          is_current?: boolean
          kiosk_user_id: string
          name: string
          order_completed_at?: string | null
          payment_method?: string | null
          price_per_box?: number | null
          subsidy_percent?: number | null
          tablets_per_box?: number | null
          total_paid?: number | null
        }
        Update: {
          collection_clinic?: string | null
          created_at?: string
          delivery_date?: string | null
          delivery_method?: string | null
          delivery_status?: string
          dosage?: string | null
          id?: string
          is_current?: boolean
          kiosk_user_id?: string
          name?: string
          order_completed_at?: string | null
          payment_method?: string | null
          price_per_box?: number | null
          subsidy_percent?: number | null
          tablets_per_box?: number | null
          total_paid?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medications_kiosk_user_id_fkey"
            columns: ["kiosk_user_id"]
            isOneToOne: false
            referencedRelation: "kiosk_users"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          kiosk_user_id: string
          participant_name: string
          programme_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          kiosk_user_id: string
          participant_name: string
          programme_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          kiosk_user_id?: string
          participant_name?: string
          programme_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "programme_feedback_kiosk_user_id_fkey"
            columns: ["kiosk_user_id"]
            isOneToOne: false
            referencedRelation: "kiosk_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_feedback_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "community_programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_tier_settings: {
        Row: {
          created_at: string
          description: string | null
          events_required: number
          id: string
          tier: number
          title: string
          title_ms: string | null
          title_ta: string | null
          title_zh: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          events_required: number
          id?: string
          tier: number
          title: string
          title_ms?: string | null
          title_ta?: string | null
          title_zh?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          events_required?: number
          id?: string
          tier?: number
          title?: string
          title_ms?: string | null
          title_ta?: string | null
          title_zh?: string | null
        }
        Relationships: []
      }
      rewards: {
        Row: {
          created_at: string
          description: string | null
          description_ms: string | null
          description_ta: string | null
          description_zh: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          max_quantity: number
          points_cost: number
          tier: number
          title: string
          title_ms: string | null
          title_ta: string | null
          title_zh: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ms?: string | null
          description_ta?: string | null
          description_zh?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_quantity?: number
          points_cost: number
          tier?: number
          title: string
          title_ms?: string | null
          title_ta?: string | null
          title_zh?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ms?: string | null
          description_ta?: string | null
          description_zh?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_quantity?: number
          points_cost?: number
          tier?: number
          title?: string
          title_ms?: string | null
          title_ta?: string | null
          title_zh?: string | null
        }
        Relationships: []
      }
      screening_results: {
        Row: {
          bmi: number | null
          created_at: string
          diastolic: number | null
          height: number | null
          id: string
          kiosk_user_id: string
          pulse: number | null
          recorded_at: string
          screening_type: string
          status: string
          systolic: number | null
          weight: number | null
        }
        Insert: {
          bmi?: number | null
          created_at?: string
          diastolic?: number | null
          height?: number | null
          id?: string
          kiosk_user_id: string
          pulse?: number | null
          recorded_at?: string
          screening_type: string
          status?: string
          systolic?: number | null
          weight?: number | null
        }
        Update: {
          bmi?: number | null
          created_at?: string
          diastolic?: number | null
          height?: number | null
          id?: string
          kiosk_user_id?: string
          pulse?: number | null
          recorded_at?: string
          screening_type?: string
          status?: string
          systolic?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      user_programme_signups: {
        Row: {
          attended_at: string | null
          id: string
          kiosk_user_id: string
          participant_name: string | null
          phone_number: string | null
          programme_id: string
          signed_up_at: string
          status: string
        }
        Insert: {
          attended_at?: string | null
          id?: string
          kiosk_user_id: string
          participant_name?: string | null
          phone_number?: string | null
          programme_id: string
          signed_up_at?: string
          status?: string
        }
        Update: {
          attended_at?: string | null
          id?: string
          kiosk_user_id?: string
          participant_name?: string | null
          phone_number?: string | null
          programme_id?: string
          signed_up_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_programme_signups_kiosk_user_id_fkey"
            columns: ["kiosk_user_id"]
            isOneToOne: false
            referencedRelation: "kiosk_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_programme_signups_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "community_programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reward_redemptions: {
        Row: {
          delivery_address: Json | null
          id: string
          kiosk_user_id: string
          points_spent: number
          quantity: number
          redeemed_at: string
          reward_id: string
          status: string
        }
        Insert: {
          delivery_address?: Json | null
          id?: string
          kiosk_user_id: string
          points_spent: number
          quantity?: number
          redeemed_at?: string
          reward_id: string
          status?: string
        }
        Update: {
          delivery_address?: Json | null
          id?: string
          kiosk_user_id?: string
          points_spent?: number
          quantity?: number
          redeemed_at?: string
          reward_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reward_redemptions_kiosk_user_id_fkey"
            columns: ["kiosk_user_id"]
            isOneToOne: false
            referencedRelation: "kiosk_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "kiosk_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _kiosk_user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
