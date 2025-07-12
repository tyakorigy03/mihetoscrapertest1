const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // loads SUPABASE_URL and SUPABASE_KEY from .env

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

module.exports = supabase;
