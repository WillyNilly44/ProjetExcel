import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qtafoovgmbczzoolljvl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0YWZvb3ZnbWJjenpvb2xsanZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NDczODcsImV4cCI6MjA2MzMyMzM4N30.Z6l-36WDcY7n4fKkoGzz5k_Ph8abCCyRSmNPckr3JrM';
export const supabase = createClient(supabaseUrl, supabaseKey);
