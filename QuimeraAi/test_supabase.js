import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://elfcrnhffuvntlfuvumd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZmNybmhmZnV2bnRsZnV2dW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU5NzkxNzcsImV4cCI6MjAzMTU1NTE3N30.xxx' // wait, i'll read from .env
);
