import { createClient } from &#39;@supabase/supabase-js&#39;;

const supabaseUrl = import.meta.env.VITE\_SUPABASE\_URL;
const supabaseAnonKey = import.meta.env.VITE\_SUPABASE\_ANON\_KEY;

if (\!supabaseUrl || \!supabaseAnonKey) {
console.error(
"Supabase URL or Anon Key is missing. Ensure VITE\_SUPABASE\_URL and VITE\_SUPABASE\_ANON\_KEY are set in your .env file."
);
}
export const supabase = createClient(supabaseUrl || "dummy\_url", supabaseAnonKey || "dummy\_key");
