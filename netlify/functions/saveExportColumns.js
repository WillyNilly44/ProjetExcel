const { supabase } = require('./supabaseClient');

exports.handler = async (event) => {
  try {

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No body provided" })
      };
    }

    let payload;
    try {
      payload = JSON.parse(event.body);
    } catch (parseErr) {
      console.error("JSON.parse error:", parseErr);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "JSON parsing error", raw: event.body })
      };
    }

    const { columns } = payload;

    if (!Array.isArray(columns)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid 'columns' field", value: columns })
      };
    }

    const { data, error } = await supabase
      .from('export_config')
      .upsert([{ id: 'singleton', columns, updated_at: new Date().toISOString() }]);

    if (error) {
      console.error("Supabase error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data })
    };

  } catch (err) {
    console.error("Unexpected error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
