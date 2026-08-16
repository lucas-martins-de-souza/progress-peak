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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      exercise_performance: {
        Row: {
          actual_load: number | null
          created_at: string
          decision: string | null
          id: string
          position: number | null
          previous_load: number | null
          rationale: string | null
          session_id: string
          suggested_load: number | null
          user_id: string
          workout_exercise_id: string
        }
        Insert: {
          actual_load?: number | null
          created_at?: string
          decision?: string | null
          id?: string
          position?: number | null
          previous_load?: number | null
          rationale?: string | null
          session_id: string
          suggested_load?: number | null
          user_id: string
          workout_exercise_id: string
        }
        Update: {
          actual_load?: number | null
          created_at?: string
          decision?: string | null
          id?: string
          position?: number | null
          previous_load?: number | null
          rationale?: string | null
          session_id?: string
          suggested_load?: number | null
          user_id?: string
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_performance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_performance_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          created_at: string
          experience_level: string | null
          goal: string | null
          height: number | null
          id: string
          name: string
          plan: string
          sex: string | null
          updated_at: string
          weekly_frequency: number | null
          weight: number | null
        }
        Insert: {
          age?: number | null
          created_at?: string
          experience_level?: string | null
          goal?: string | null
          height?: number | null
          id: string
          name?: string
          plan?: string
          sex?: string | null
          updated_at?: string
          weekly_frequency?: number | null
          weight?: number | null
        }
        Update: {
          age?: number | null
          created_at?: string
          experience_level?: string | null
          goal?: string | null
          height?: number | null
          id?: string
          name?: string
          plan?: string
          sex?: string | null
          updated_at?: string
          weekly_frequency?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      set_performance: {
        Row: {
          created_at: string
          exercise_performance_id: string
          id: string
          reps: number | null
          rir: number | null
          set_number: number
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_performance_id: string
          id?: string
          reps?: number | null
          rir?: number | null
          set_number: number
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_performance_id?: string
          id?: string
          reps?: number | null
          rir?: number | null
          set_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_performance_exercise_performance_id_fkey"
            columns: ["exercise_performance_id"]
            isOneToOne: false
            referencedRelation: "exercise_performance"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          adherence_score: number | null
          completed_at: string | null
          disposition_score: number | null
          energy_score: number | null
          id: string
          note: string | null
          pain_score: number | null
          sleep_score: number | null
          started_at: string
          stress_score: number | null
          user_id: string
          workout_id: string
        }
        Insert: {
          adherence_score?: number | null
          completed_at?: string | null
          disposition_score?: number | null
          energy_score?: number | null
          id?: string
          note?: string | null
          pain_score?: number | null
          sleep_score?: number | null
          started_at?: string
          stress_score?: number | null
          user_id: string
          workout_id: string
        }
        Update: {
          adherence_score?: number | null
          completed_at?: string | null
          disposition_score?: number | null
          energy_score?: number | null
          id?: string
          note?: string | null
          pain_score?: number | null
          sleep_score?: number | null
          started_at?: string
          stress_score?: number | null
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          created_at: string
          current_load: number
          exercise_name: string
          id: string
          max_reps: number
          min_reps: number
          position: number
          sets: number
          suggested_increment: number
          target_rir: number
          updated_at: string
          user_id: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          current_load?: number
          exercise_name: string
          id?: string
          max_reps?: number
          min_reps?: number
          position?: number
          sets?: number
          suggested_increment?: number
          target_rir?: number
          updated_at?: string
          user_id: string
          workout_id: string
        }
        Update: {
          created_at?: string
          current_load?: number
          exercise_name?: string
          id?: string
          max_reps?: number
          min_reps?: number
          position?: number
          sets?: number
          suggested_increment?: number
          target_rir?: number
          updated_at?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
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
