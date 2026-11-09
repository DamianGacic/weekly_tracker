export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      items: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          protein: number;
          carbs: number;
          fat: number;
          calories: number;
          staple: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          protein: number;
          carbs: number;
          fat: number;
          calories: number;
          staple?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          protein?: number;
          carbs?: number;
          fat?: number;
          calories?: number;
          staple?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      logs: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          consumed_at: string;
          amount: number;
        };
        Insert: {
          id?: string;
          user_id?: string;
          item_id: string;
          consumed_at?: string;
          amount?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          item_id?: string;
          consumed_at?: string;
          amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "logs_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      raw_macros: {
        Row: {
          id: string;
          user_id: string;
          protein: number;
          carbs: number;
          fat: number;
          calories: number;
          consumed_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          protein: number;
          carbs: number;
          fat: number;
          calories: number;
          consumed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          protein?: number;
          carbs?: number;
          fat?: number;
          calories?: number;
          consumed_at?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          user_id: string;
          protein_value: number | null;
          protein_anchor_week: string | null;
          protein_step: number;
          protein_step_mode: "flat" | "percent";
          calories_value: number | null;
          calories_anchor_week: string | null;
          calories_step: number;
          calories_step_mode: "flat" | "percent";
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          protein_value?: number | null;
          protein_anchor_week?: string | null;
          protein_step?: number;
          protein_step_mode?: "flat" | "percent";
          calories_value?: number | null;
          calories_anchor_week?: string | null;
          calories_step?: number;
          calories_step_mode?: "flat" | "percent";
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          protein_value?: number | null;
          protein_anchor_week?: string | null;
          protein_step?: number;
          protein_step_mode?: "flat" | "percent";
          calories_value?: number | null;
          calories_anchor_week?: string | null;
          calories_step?: number;
          calories_step_mode?: "flat" | "percent";
          updated_at?: string;
        };
        Relationships: [];
      };
      movements: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          kind: "reps" | "time";
          default_amount: number;
          goal_value: number | null;
          goal_anchor_week: string | null;
          goal_step: number;
          goal_step_mode: "flat" | "percent";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          kind: "reps" | "time";
          default_amount: number;
          goal_value?: number | null;
          goal_anchor_week?: string | null;
          goal_step?: number;
          goal_step_mode?: "flat" | "percent";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          kind?: "reps" | "time";
          default_amount?: number;
          goal_value?: number | null;
          goal_anchor_week?: string | null;
          goal_step?: number;
          goal_step_mode?: "flat" | "percent";
          created_at?: string;
        };
        Relationships: [];
      };
      movement_logs: {
        Row: {
          id: string;
          user_id: string;
          movement_id: string;
          amount: number;
          logged_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          movement_id: string;
          amount: number;
          logged_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          movement_id?: string;
          amount?: number;
          logged_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "movement_logs_movement_id_fkey";
            columns: ["movement_id"];
            isOneToOne: false;
            referencedRelation: "movements";
            referencedColumns: ["id"];
          },
        ];
      };
      lifts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          /** An array of `{ sets, weight, reps }`; read through `goalFromJson`. */
          goal: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          goal?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          goal?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      lift_sets: {
        Row: {
          id: string;
          user_id: string;
          lift_id: string;
          weight: number;
          reps: number;
          logged_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          lift_id: string;
          weight: number;
          reps: number;
          logged_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lift_id?: string;
          weight?: number;
          reps?: number;
          logged_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lift_sets_lift_id_fkey";
            columns: ["lift_id"];
            isOneToOne: false;
            referencedRelation: "lifts";
            referencedColumns: ["id"];
          },
        ];
      };
      week_notes: {
        Row: {
          user_id: string;
          week_start: string;
          note: string;
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          week_start: string;
          note: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          week_start?: string;
          note?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          goal_days: number | null;
          includes: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          goal_days?: number | null;
          includes?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          goal_days?: number | null;
          includes?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      habit_checks: {
        Row: {
          user_id: string;
          habit_id: string;
          day: string;
          auto: boolean;
        };
        Insert: {
          user_id?: string;
          habit_id: string;
          day: string;
          auto?: boolean;
        };
        Update: {
          user_id?: string;
          habit_id?: string;
          day?: string;
          auto?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "habit_checks_habit_id_fkey";
            columns: ["habit_id"];
            isOneToOne: false;
            referencedRelation: "habits";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
