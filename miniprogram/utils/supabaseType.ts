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
    PostgrestVersion: "13.0.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      channels: {
        Row: {
          category: string | null
          cover_url: string | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          file_format: string | null
          id: string
          is_official: boolean | null
          name: string
          naming_prefix: string | null
          storage_path: string | null
          subscriber_count: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          file_format?: string | null
          id?: string
          is_official?: boolean | null
          name: string
          naming_prefix?: string | null
          storage_path?: string | null
          subscriber_count?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          file_format?: string | null
          id?: string
          is_official?: boolean | null
          name?: string
          naming_prefix?: string | null
          storage_path?: string | null
          subscriber_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channels_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string | null
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          audio_timestamp: number | null
          content: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          is_pinned: boolean | null
          like_count: number | null
          parent_id: string | null
          podcast_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          audio_timestamp?: number | null
          content: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_pinned?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          podcast_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          audio_timestamp?: number | null
          content?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_pinned?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          podcast_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_recommendations: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_order: number | null
          expires_at: string | null
          id: string
          podcast_id: string | null
          recommendation_text: string
          recommendation_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          expires_at?: string | null
          id?: string
          podcast_id?: string | null
          recommendation_text: string
          recommendation_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          expires_at?: string | null
          id?: string
          podcast_id?: string | null
          recommendation_text?: string
          recommendation_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "editorial_recommendations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_recommendations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_recommendations_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      insights: {
        Row: {
          audio_timestamp: number | null
          click_count: number | null
          created_at: string | null
          creator_id: string | null
          detailed_content: string | null
          display_order: number | null
          duration: number | null
          id: string
          insight_type: string | null
          keywords: Json | null
          like_count: number | null
          podcast_id: string
          related_authors: Json | null
          related_papers: Json | null
          source_type: string | null
          status: string | null
          summary: string
          title: string | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          audio_timestamp?: number | null
          click_count?: number | null
          created_at?: string | null
          creator_id?: string | null
          detailed_content?: string | null
          display_order?: number | null
          duration?: number | null
          id?: string
          insight_type?: string | null
          keywords?: Json | null
          like_count?: number | null
          podcast_id: string
          related_authors?: Json | null
          related_papers?: Json | null
          source_type?: string | null
          status?: string | null
          summary: string
          title?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          audio_timestamp?: number | null
          click_count?: number | null
          created_at?: string | null
          creator_id?: string | null
          detailed_content?: string | null
          display_order?: number | null
          duration?: number | null
          id?: string
          insight_type?: string | null
          keywords?: Json | null
          like_count?: number | null
          podcast_id?: string
          related_authors?: Json | null
          related_papers?: Json | null
          source_type?: string | null
          status?: string | null
          summary?: string
          title?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "insights_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          code: string
          country: string | null
          created_at: string | null
          id: string
          name_en: string | null
          name_zh: string
          type: string | null
        }
        Insert: {
          code: string
          country?: string | null
          created_at?: string | null
          id?: string
          name_en?: string | null
          name_zh: string
          type?: string | null
        }
        Update: {
          code?: string
          country?: string | null
          created_at?: string | null
          id?: string
          name_en?: string | null
          name_zh?: string
          type?: string | null
        }
        Relationships: []
      }
      paper_recommendations: {
        Row: {
          abstract: string
          channel_cover_url: string | null
          created_at: string | null
          display_order: number | null
          id: string
          paper_url: string | null
          status: string | null
          team: string
          title: string
          updated_at: string | null
        }
        Insert: {
          abstract: string
          channel_cover_url?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          paper_url?: string | null
          status?: string | null
          team: string
          title: string
          updated_at?: string | null
        }
        Update: {
          abstract?: string
          channel_cover_url?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          paper_url?: string | null
          status?: string | null
          team?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      podcasts: {
        Row: {
          all_categories: string | null
          arxiv_id: string | null
          audio_url: string | null
          authors: Json | null
          channel_id: string | null
          comment_count: number | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          doi: string | null
          duration: number | null
          favorite_count: number | null
          id: string
          institution: string | null
          like_count: number | null
          paper_title: string | null
          paper_url: string | null
          play_count: number | null
          primary_category: string | null
          project_url: string | null
          publish_date: string | null
          share_count: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          all_categories?: string | null
          arxiv_id?: string | null
          audio_url?: string | null
          authors?: Json | null
          channel_id?: string | null
          comment_count?: number | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          doi?: string | null
          duration?: number | null
          favorite_count?: number | null
          id?: string
          institution?: string | null
          like_count?: number | null
          paper_title?: string | null
          paper_url?: string | null
          play_count?: number | null
          primary_category?: string | null
          project_url?: string | null
          publish_date?: string | null
          share_count?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          all_categories?: string | null
          arxiv_id?: string | null
          audio_url?: string | null
          authors?: Json | null
          channel_id?: string | null
          comment_count?: number | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          doi?: string | null
          duration?: number | null
          favorite_count?: number | null
          id?: string
          institution?: string | null
          like_count?: number | null
          paper_title?: string | null
          paper_url?: string | null
          play_count?: number | null
          primary_category?: string | null
          project_url?: string | null
          publish_date?: string | null
          share_count?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "podcasts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      static_assets: {
        Row: {
          created_at: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          metadata: Json | null
          name: string
          original_name: string | null
          updated_at: string | null
          usage_type: string | null
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          metadata?: Json | null
          name: string
          original_name?: string | null
          updated_at?: string | null
          usage_type?: string | null
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          metadata?: Json | null
          name?: string
          original_name?: string | null
          updated_at?: string | null
          usage_type?: string | null
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string | null
          id: string
          podcast_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          podcast_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          podcast_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_insight_interactions: {
        Row: {
          created_at: string | null
          id: string
          insight_id: string
          interaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          insight_id: string
          interaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          insight_id?: string
          interaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_insight_interactions_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_insight_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_insight_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_likes: {
        Row: {
          created_at: string | null
          id: string
          podcast_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          podcast_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          podcast_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_likes_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_play_history: {
        Row: {
          completed: boolean | null
          id: string
          play_duration: number | null
          play_position: number | null
          played_at: string | null
          podcast_id: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          id?: string
          play_duration?: number | null
          play_position?: number | null
          played_at?: string | null
          podcast_id?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          id?: string
          play_duration?: number | null
          play_position?: number | null
          played_at?: string | null
          podcast_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_play_history_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_play_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_play_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          academic_field: Json | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          github_url: string | null
          id: string
          institution: string | null
          institution_custom: string | null
          is_active: boolean | null
          nickname: string | null
          orcid: string | null
          personal_website: string | null
          role: string | null
          updated_at: string | null
          username: string | null
          wechat_openid: string
        }
        Insert: {
          academic_field?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          github_url?: string | null
          id?: string
          institution?: string | null
          institution_custom?: string | null
          is_active?: boolean | null
          nickname?: string | null
          orcid?: string | null
          personal_website?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
          wechat_openid: string
        }
        Update: {
          academic_field?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          github_url?: string | null
          id?: string
          institution?: string | null
          institution_custom?: string | null
          is_active?: boolean | null
          nickname?: string | null
          orcid?: string | null
          personal_website?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
          wechat_openid?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_profiles: {
        Row: {
          academic_field: Json | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          github_url: string | null
          has_avatar: boolean | null
          has_custom_nickname: boolean | null
          id: string | null
          institution: string | null
          institution_custom: string | null
          is_active: boolean | null
          nickname: string | null
          orcid: string | null
          personal_website: string | null
          profile_complete: boolean | null
          role: string | null
          updated_at: string | null
          username: string | null
          wechat_openid: string | null
        }
        Insert: {
          academic_field?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          github_url?: string | null
          has_avatar?: never
          has_custom_nickname?: never
          id?: string | null
          institution?: string | null
          institution_custom?: string | null
          is_active?: boolean | null
          nickname?: string | null
          orcid?: string | null
          personal_website?: string | null
          profile_complete?: never
          role?: string | null
          updated_at?: string | null
          username?: string | null
          wechat_openid?: string | null
        }
        Update: {
          academic_field?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          github_url?: string | null
          has_avatar?: never
          has_custom_nickname?: never
          id?: string | null
          institution?: string | null
          institution_custom?: string | null
          is_active?: boolean | null
          nickname?: string | null
          orcid?: string | null
          personal_website?: string | null
          profile_complete?: never
          role?: string | null
          updated_at?: string | null
          username?: string | null
          wechat_openid?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      decrement_comment_count: {
        Args: { podcast_id: string }
        Returns: undefined
      }
      decrement_comment_like_count: {
        Args: { comment_id: string }
        Returns: undefined
      }
      decrement_favorite_count: {
        Args: { podcast_id: string }
        Returns: undefined
      }
      decrement_like_count: { Args: { podcast_id: string }; Returns: undefined }
      get_or_create_user_profile: {
        Args: { user_id: string }
        Returns: {
          academic_field: Json | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          github_url: string | null
          id: string
          institution: string | null
          institution_custom: string | null
          is_active: boolean | null
          nickname: string | null
          orcid: string | null
          personal_website: string | null
          role: string | null
          updated_at: string | null
          username: string | null
          wechat_openid: string
        }
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      increment_comment_count: {
        Args: { podcast_id: string }
        Returns: undefined
      }
      increment_comment_like_count: {
        Args: { comment_id: string }
        Returns: undefined
      }
      increment_favorite_count: {
        Args: { podcast_id: string }
        Returns: undefined
      }
      increment_like_count: { Args: { podcast_id: string }; Returns: undefined }
      increment_play_count: { Args: { podcast_id: string }; Returns: undefined }
      wechat_login: {
        Args: { user_info?: Json; wechat_code: string }
        Returns: {
          academic_field: Json
          access_token: string
          avatar_url: string
          created_at: string
          id: string
          orcid: string
          role: string
          username: string
          wechat_openid: string
        }[]
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
