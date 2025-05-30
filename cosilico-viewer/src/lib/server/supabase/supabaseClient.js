import { createClient } from '@supabase/supabase-js'
import { API_URL, SERVICE_ROLE_KEY } from '$env/static/private';

export const supabase = createClient(
  API_URL,
  SERVICE_ROLE_KEY
)