import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ndhushwymhfznzfvlsyk.supabase.co'
const supabaseKey = 'sb_publishable_vCfPCqdCqND_xs3ltlL3NQ_Ya8DdNCm'

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)