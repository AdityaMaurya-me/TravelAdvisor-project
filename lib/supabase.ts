import { createClient } from "@/lib/supabase/client";

// Transitional browser client for existing client components.  New database
// writes live in app/actions and server reads use lib/supabase/server.
export const supabase = createClient();
