const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { data, error } = await supabase
      .from('dashboard_thresholds')
      .upsert([{ id: 1, ...body }], { onConflict: 'id' });

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Thresholds updated.', data })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Processing error: ' + err.message })
    };
  }
};
