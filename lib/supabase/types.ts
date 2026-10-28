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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
