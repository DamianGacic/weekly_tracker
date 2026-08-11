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
        };
        Insert: {
          id?: string;
          user_id?: string;
          item_id: string;
          consumed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          item_id?: string;
          consumed_at?: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
