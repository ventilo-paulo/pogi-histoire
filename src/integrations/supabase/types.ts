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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          author: string | null
          category: string | null
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          indexable: boolean
          list_text: string | null
          meta_description: string | null
          meta_title: string | null
          notion_last_edited_at: string | null
          notion_page_id: string | null
          published: boolean
          published_at: string | null
          related_article_ids: string[]
          slug: string
          sources: Json
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          indexable?: boolean
          list_text?: string | null
          meta_description?: string | null
          meta_title?: string | null
          notion_last_edited_at?: string | null
          notion_page_id?: string | null
          published?: boolean
          published_at?: string | null
          related_article_ids?: string[]
          slug: string
          sources?: Json
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          indexable?: boolean
          list_text?: string | null
          meta_description?: string | null
          meta_title?: string | null
          notion_last_edited_at?: string | null
          notion_page_id?: string | null
          published?: boolean
          published_at?: string | null
          related_article_ids?: string[]
          slug?: string
          sources?: Json
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      media_credits: {
        Row: {
          created_at: string
          credit: string | null
          filename: string | null
          path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit?: string | null
          filename?: string | null
          path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit?: string | null
          filename?: string | null
          path?: string
          updated_at?: string
        }
        Relationships: []
      }
      notion_settings: {
        Row: {
          articles_db_id: string | null
          articles_mapping: Json
          created_at: string
          enabled: boolean
          id: boolean
          last_sync_at: string | null
          updated_at: string
          videos_db_id: string | null
          videos_mapping: Json
        }
        Insert: {
          articles_db_id?: string | null
          articles_mapping?: Json
          created_at?: string
          enabled?: boolean
          id?: boolean
          last_sync_at?: string | null
          updated_at?: string
          videos_db_id?: string | null
          videos_mapping?: Json
        }
        Update: {
          articles_db_id?: string | null
          articles_mapping?: Json
          created_at?: string
          enabled?: boolean
          id?: boolean
          last_sync_at?: string | null
          updated_at?: string
          videos_db_id?: string | null
          videos_mapping?: Json
        }
        Relationships: []
      }
      notion_sync_log: {
        Row: {
          action: string | null
          details: Json | null
          direction: string
          entity: string | null
          id: string
          message: string | null
          ok: boolean
          ref_id: string | null
          run_at: string
        }
        Insert: {
          action?: string | null
          details?: Json | null
          direction: string
          entity?: string | null
          id?: string
          message?: string | null
          ok?: boolean
          ref_id?: string | null
          run_at?: string
        }
        Update: {
          action?: string | null
          details?: Json | null
          direction?: string
          entity?: string | null
          id?: string
          message?: string | null
          ok?: boolean
          ref_id?: string | null
          run_at?: string
        }
        Relationships: []
      }
      seo_alerts: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          kind: string
          level: string
          read_at: string | null
          run_id: string | null
          target: string | null
          title: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          kind: string
          level?: string
          read_at?: string | null
          run_id?: string | null
          target?: string | null
          title: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          kind?: string
          level?: string
          read_at?: string | null
          run_id?: string | null
          target?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_alerts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "seo_index_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_index_runs: {
        Row: {
          finished_at: string | null
          id: string
          message: string | null
          ok: boolean
          sitemap_errors: number
          sitemap_status: string | null
          sitemap_warnings: number
          started_at: string
          trigger: string
          urls_error: number
          urls_indexed: number
          urls_missing: number
          urls_pending: number
          urls_total: number
        }
        Insert: {
          finished_at?: string | null
          id?: string
          message?: string | null
          ok?: boolean
          sitemap_errors?: number
          sitemap_status?: string | null
          sitemap_warnings?: number
          started_at?: string
          trigger?: string
          urls_error?: number
          urls_indexed?: number
          urls_missing?: number
          urls_pending?: number
          urls_total?: number
        }
        Update: {
          finished_at?: string | null
          id?: string
          message?: string | null
          ok?: boolean
          sitemap_errors?: number
          sitemap_status?: string | null
          sitemap_warnings?: number
          started_at?: string
          trigger?: string
          urls_error?: number
          urls_indexed?: number
          urls_missing?: number
          urls_pending?: number
          urls_total?: number
        }
        Relationships: []
      }
      seo_url_status: {
        Row: {
          checked_at: string
          coverage_state: string | null
          error: string | null
          kind: string | null
          label: string | null
          last_crawl_time: string | null
          robots_state: string | null
          updated_at: string
          url: string
          verdict: string | null
        }
        Insert: {
          checked_at?: string
          coverage_state?: string | null
          error?: string | null
          kind?: string | null
          label?: string | null
          last_crawl_time?: string | null
          robots_state?: string | null
          updated_at?: string
          url: string
          verdict?: string | null
        }
        Update: {
          checked_at?: string
          coverage_state?: string | null
          error?: string | null
          kind?: string | null
          label?: string | null
          last_crawl_time?: string | null
          robots_state?: string | null
          updated_at?: string
          url?: string
          verdict?: string | null
        }
        Relationships: []
      }
      site_health_checks: {
        Row: {
          checked_at: string
          detail: string | null
          failing_since: string | null
          http_status: number | null
          kind: string
          label: string | null
          last_ok_at: string | null
          redirect_chain: string | null
          response_bytes: number | null
          response_ms: number | null
          snapshot_url: string | null
          status: string
          target: string
        }
        Insert: {
          checked_at?: string
          detail?: string | null
          failing_since?: string | null
          http_status?: number | null
          kind: string
          label?: string | null
          last_ok_at?: string | null
          redirect_chain?: string | null
          response_bytes?: number | null
          response_ms?: number | null
          snapshot_url?: string | null
          status?: string
          target: string
        }
        Update: {
          checked_at?: string
          detail?: string | null
          failing_since?: string | null
          http_status?: number | null
          kind?: string
          label?: string | null
          last_ok_at?: string | null
          redirect_chain?: string | null
          response_bytes?: number | null
          response_ms?: number | null
          snapshot_url?: string | null
          status?: string
          target?: string
        }
        Relationships: []
      }
      site_health_runs: {
        Row: {
          checks_failed: number
          checks_ok: number
          checks_total: number
          duration_ms: number | null
          finished_at: string | null
          id: string
          message: string | null
          ok: boolean
          started_at: string
          trigger: string
        }
        Insert: {
          checks_failed?: number
          checks_ok?: number
          checks_total?: number
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          message?: string | null
          ok?: boolean
          started_at?: string
          trigger?: string
        }
        Update: {
          checks_failed?: number
          checks_ok?: number
          checks_total?: number
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          message?: string | null
          ok?: boolean
          started_at?: string
          trigger?: string
        }
        Relationships: []
      }
      site_health_settings: {
        Row: {
          daily_summary_enabled: boolean
          email_enabled: boolean
          enabled: boolean
          id: boolean
          last_daily_summary_at: string | null
          notify_email: string | null
          updated_at: string
        }
        Insert: {
          daily_summary_enabled?: boolean
          email_enabled?: boolean
          enabled?: boolean
          id?: boolean
          last_daily_summary_at?: string | null
          notify_email?: string | null
          updated_at?: string
        }
        Update: {
          daily_summary_enabled?: boolean
          email_enabled?: boolean
          enabled?: boolean
          id?: boolean
          last_daily_summary_at?: string | null
          notify_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          format: string
          id: string
          notion_last_edited_at: string | null
          notion_page_id: string | null
          published: boolean
          published_at: string | null
          slug: string | null
          subtitle: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          format?: string
          id?: string
          notion_last_edited_at?: string | null
          notion_page_id?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string | null
          subtitle?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          format?: string
          id?: string
          notion_last_edited_at?: string | null
          notion_page_id?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string | null
          subtitle?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
