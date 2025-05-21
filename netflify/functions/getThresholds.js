const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async () => {
  const { data, error } = await supabase
    .from('dashboard_thresholds')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ data: data[0] })
  };
};
