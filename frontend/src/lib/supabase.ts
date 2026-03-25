import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nspehtlzknfbiwvjswge.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcGVodGx6a25mYml3dmpzd2dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTQyNzcsImV4cCI6MjA4OTk5MDI3N30.--MQIejpZat94lV61BEkwj3mXHdOFG34HDqiOdydp2I'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
