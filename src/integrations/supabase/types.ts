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
          app_icon_url: string
          app_id: string
          contact_email: string
          contact_phone: string
          created_at: string
          default_currency: string
          deposit_enabled: boolean
          favicon: string
          footer_text: string
          id: string
          logo_url: string
          maintenance_mode: boolean
          max_bot_per_user: number
          meta_description: string
          meta_keywords: string
          min_deposit: number
          min_withdrawal: number
          primary_color: string
          privacy_url: string
          require_email_verification: boolean
          site_name: string
          site_title: string
          support_url: string
          telegram_link: string
          terms_url: string
          updated_at: string
          withdrawal_auto_approve: boolean
          withdrawal_auto_max: number
          withdrawal_enabled: boolean
        }
        Insert: {
          allow_signups?: boolean
          announcement_bar?: string
          api_key?: string
          app_icon_url?: string
          app_id?: string
          contact_email?: string
          contact_phone?: string
          created_at?: string
          default_currency?: string
          deposit_enabled?: boolean
          favicon?: string
          footer_text?: string
          id?: string
          logo_url?: string
          maintenance_mode?: boolean
          max_bot_per_user?: number
          meta_description?: string
          meta_keywords?: string
          min_deposit?: number
          min_withdrawal?: number
          primary_color?: string
          privacy_url?: string
          require_email_verification?: boolean
          site_name?: string
          site_title?: string
          support_url?: string
          telegram_link?: string
          terms_url?: string
          updated_at?: string
          withdrawal_auto_approve?: boolean
          withdrawal_auto_max?: number
          withdrawal_enabled?: boolean
        }
        Update: {
          allow_signups?: boolean
          announcement_bar?: string
          api_key?: string
          app_icon_url?: string
          app_id?: string
          contact_email?: string
          contact_phone?: string
          created_at?: string
          default_currency?: string
          deposit_enabled?: boolean
          favicon?: string
          footer_text?: string
          id?: string
          logo_url?: string
          maintenance_mode?: boolean
          max_bot_per_user?: number
          meta_description?: string
          meta_keywords?: string
          min_deposit?: number
          min_withdrawal?: number
          primary_color?: string
          privacy_url?: string
          require_email_verification?: boolean
          site_name?: string
          site_title?: string
          support_url?: string
          telegram_link?: string
          terms_url?: string
          updated_at?: string
          withdrawal_auto_approve?: boolean
          withdrawal_auto_max?: number
          withdrawal_enabled?: boolean
        }
        Relationships: []
      }
      app_users: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          id_number: string | null
          name: string
          password_hash: string
          phone: string | null
          role: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          email: string
          id?: string
          id_number?: string | null
          name?: string
          password_hash: string
          phone?: string | null
          role?: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          id_number?: string | null
          name?: string
          password_hash?: string
          phone?: string | null
          role?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      auth_sessions: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          ip: string
          last_used_at: string
          refresh_token: string
          revoked: boolean
          user_agent: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          expires_at: string
          id?: string
          ip?: string
          last_used_at?: string
          refresh_token: string
          revoked?: boolean
          user_agent?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          ip?: string
          last_used_at?: string
          refresh_token?: string
          revoked?: boolean
          user_agent?: string
          user_id?: string
        }
        Relationships: []
      }
      bots: {
        Row: {
          category: string
          created_at: string
          description: string
          enabled: boolean
          featured: boolean
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
          featured?: boolean
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
          featured?: boolean
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
      deposits: {
        Row: {
          amount: number
          created_at: string
          credited: boolean
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
          created_at?: string
          credited?: boolean
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
          created_at?: string
          credited?: boolean
          deriv_account?: string
          id?: string
          mpesa_checkout_request_id?: string | null
          mpesa_receipt?: string | null
          phone_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_log: {
        Row: {
          created_at: string
          error: string
          id: string
          status: string
          subject: string
          template_key: string
          to_email: string
        }
        Insert: {
          created_at?: string
          error?: string
          id?: string
          status?: string
          subject?: string
          template_key?: string
          to_email: string
        }
        Update: {
          created_at?: string
          error?: string
          id?: string
          status?: string
          subject?: string
          template_key?: string
          to_email?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          enabled: boolean
          html: string
          id: string
          name: string
          subject: string
          template_key: string
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          html?: string
          id?: string
          name: string
          subject?: string
          template_key: string
          text?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          html?: string
          id?: string
          name?: string
          subject?: string
          template_key?: string
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_verifications: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string | null
          token: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code?: string | null
          token: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string | null
          token?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          action: string
          created_at: string
          id: string
          identifier: string
          ip: string
          success: boolean
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          identifier: string
          ip?: string
          success?: boolean
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          identifier?: string
          ip?: string
          success?: boolean
        }
        Relationships: []
      }
      manual_trades: {
        Row: {
          balance_after: number
          bot_id: string | null
          bot_name: string
          created_at: string
          deriv_account: string
          id: string
          payout: number
          profit: number
          result: string
          run_id: string | null
          stake: number
        }
        Insert: {
          balance_after?: number
          bot_id?: string | null
          bot_name?: string
          created_at?: string
          deriv_account: string
          id?: string
          payout?: number
          profit?: number
          result?: string
          run_id?: string | null
          stake?: number
        }
        Update: {
          balance_after?: number
          bot_id?: string | null
          bot_name?: string
          created_at?: string
          deriv_account?: string
          id?: string
          payout?: number
          profit?: number
          result?: string
          run_id?: string | null
          stake?: number
        }
        Relationships: []
      }
      mpesa_config: {
        Row: {
          b2c_enabled: boolean
          b2c_shortcode: string
          consumer_key: string
          consumer_secret: string
          created_at: string
          environment: string
          id: string
          initiator_name: string
          passkey: string
          queue_timeout_url: string
          result_url: string
          security_credential: string
          shortcode: string
          updated_at: string
        }
        Insert: {
          b2c_enabled?: boolean
          b2c_shortcode?: string
          consumer_key?: string
          consumer_secret?: string
          created_at?: string
          environment?: string
          id?: string
          initiator_name?: string
          passkey?: string
          queue_timeout_url?: string
          result_url?: string
          security_credential?: string
          shortcode?: string
          updated_at?: string
        }
        Update: {
          b2c_enabled?: boolean
          b2c_shortcode?: string
          consumer_key?: string
          consumer_secret?: string
          created_at?: string
          environment?: string
          id?: string
          initiator_name?: string
          passkey?: string
          queue_timeout_url?: string
          result_url?: string
          security_credential?: string
          shortcode?: string
          updated_at?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
          user_id?: string
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
      smtp_config: {
        Row: {
          created_at: string
          enabled: boolean
          from_email: string
          from_name: string
          host: string
          id: string
          password: string
          port: number
          secure: boolean
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          password?: string
          port?: number
          secure?: boolean
          updated_at?: string
          username?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          password?: string
          port?: number
          secure?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      user_balances: {
        Row: {
          balance: number
          created_at: string
          deriv_account: string
          id: string
          total_deposited: number
          total_withdrawn: number
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          deriv_account: string
          id?: string
          total_deposited?: number
          total_withdrawn?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          deriv_account?: string
          id?: string
          total_deposited?: number
          total_withdrawn?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_email_preferences: {
        Row: {
          created_at: string
          email: string
          enabled: boolean
          id: string
          identifier: string
          marketing: boolean
          notify_deposits: boolean
          notify_login: boolean
          notify_trades: boolean
          notify_withdrawals: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          enabled?: boolean
          id?: string
          identifier: string
          marketing?: boolean
          notify_deposits?: boolean
          notify_login?: boolean
          notify_trades?: boolean
          notify_withdrawals?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          enabled?: boolean
          id?: string
          identifier?: string
          marketing?: boolean
          notify_deposits?: boolean
          notify_login?: boolean
          notify_trades?: boolean
          notify_withdrawals?: boolean
          updated_at?: string
        }
        Relationships: []
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
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          deriv_account: string
          id: string
          mpesa_receipt: string | null
          mpesa_transaction_id: string | null
          phone_number: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          deriv_account: string
          id?: string
          mpesa_receipt?: string | null
          mpesa_transaction_id?: string | null
          phone_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          deriv_account?: string
          id?: string
          mpesa_receipt?: string | null
          mpesa_transaction_id?: string | null
          phone_number?: string
          status?: string
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
