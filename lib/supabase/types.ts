// Placeholder até rodar `supabase gen types typescript --project-id <id> > lib/supabase/types.ts`.
// Por ora, tipos compartilhados ficam em `types/crm.ts`.
export type Database = {
  public: {
    Tables: Record<string, unknown>;
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
    Enums: Record<string, unknown>;
  };
};
