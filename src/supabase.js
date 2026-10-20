import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://drcxxbymdonyfjtkiouf.supabase.co'
const supabaseKey = 'sb_publishable_G4oyRa9CfTI80TEMOXU3dA_6NTOipc3'

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)