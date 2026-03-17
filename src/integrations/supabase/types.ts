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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          bot_id: string | null
          created_at: string
          deriv_account: string
          id: string
          message: string
          status: string
          updated_at: string
        }
        Insert: {
          bot_id?: string | null
          created_at?: string
          deriv_account: string
          id?: string
          message?: string
          status?: string
          updated_at?: string
        }
        Update: {
          bot_id?: string | null
          created_at?: string
          deriv_account?: string
          id?: string
          message?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          allow_signups: boolean
          announcement_bar: string
          api_key: string
          app_id: string
          contact_email: string
          contact_phone: string
          created_at: string
          default_currency: string
          favicon: string
          footer_text: string
          id: string
          logo_url: string
          maintenance_mode: boolean
          max_bot_per_user: number
          meta_description: string
          meta_keywords: string
          primary_color: string
          privacy_url: string
          site_name: string
          site_title: string
          support_url: string
          telegram_link: string
          terms_url: string
          updated_at: string
        }
        Insert: {
          allow_signups?: boolean
          announcement_bar?: string
          api_key?: string
          app_id?: string
          contact_email?: string
          contact_phone?: string
          created_at?: string
          default_currency?: string
          favicon?: string
          footer_text?: string
          id?: string
          logo_url?: string
          maintenance_mode?: boolean
          max_bot_per_user?: number
          meta_description?: string
          meta_keywords?: string
          primary_color?: string
          privacy_url?: string
          site_name?: string
          site_title?: string
          support_url?: string
          telegram_link?: string
          terms_url?: string
          updated_at?: string
        }
        Update: {
          allow_signups?: boolean
          announcement_bar?: string
          api_key?: string
          app_id?: string
          contact_email?: string
          contact_phone?: string
          created_at?: string
          default_currency?: string
          favicon?: string
          footer_text?: string
          id?: string
          logo_url?: string
          maintenance_mode?: boolean
          max_bot_per_user?: number
          meta_description?: string
          meta_keywords?: string
          primary_color?: string
          privacy_url?: string
          site_name?: string
          site_title?: string
          support_url?: string
          telegram_link?: string
          terms_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      bots: {
        Row: {
          category: string
          created_at: string
          description: string
          enabled: boolean
          id: string
          name: string
          price: number
          profit_loss: number
          strategy: string
          trades: number
          updated_at: string
          win_rate: number
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          name: string
          price?: number
          profit_loss?: number
          strategy?: string
          trades?: number
          updated_at?: string
          win_rate?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          name?: string
          price?: number
          profit_loss?: number
          strategy?: string
          trades?: number
          updated_at?: string
          win_rate?: number
        }
        Relationships: []
      }
      mpesa_config: {
        Row: {
          consumer_key: string
          consumer_secret: string
          created_at: string
          environment: string
          id: string
          passkey: string
          shortcode: string
          updated_at: string
        }
        Insert: {
          consumer_key?: string
          consumer_secret?: string
          created_at?: string
          environment?: string
          id?: string
          passkey?: string
          shortcode?: string
          updated_at?: string
        }
        Update: {
          consumer_key?: string
          consumer_secret?: string
          created_at?: string
          environment?: string
          id?: string
          passkey?: string
          shortcode?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          bot_id: string | null
          created_at: string
          deriv_account: string
          id: string
          mpesa_checkout_request_id: string | null
          mpesa_receipt: string | null
          phone_number: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          bot_id?: string | null
          created_at?: string
          deriv_account: string
          id?: string
          mpesa_checkout_request_id?: string | null
          mpesa_receipt?: string | null
          phone_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bot_id?: string | null
          created_at?: string
          deriv_account?: string
          id?: string
          mpesa_checkout_request_id?: string | null
          mpesa_receipt?: string | null
          phone_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          deriv_account: string
          deriv_currency: string
          deriv_token: string
          id: string
          is_active: boolean
          last_login: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deriv_account: string
          deriv_currency?: string
          deriv_token: string
          id?: string
          is_active?: boolean
          last_login?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deriv_account?: string
          deriv_currency?: string
          deriv_token?: string
          id?: string
          is_active?: boolean
          last_login?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
