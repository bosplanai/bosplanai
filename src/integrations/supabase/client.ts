import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://aeocavqkugwcfxxtcdjp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_6AkpqmuIVV6dfHNmPtftjg_QyYbvCQM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
