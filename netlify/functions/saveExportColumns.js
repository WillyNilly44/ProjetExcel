const { supabase } = require('./supabaseClient');

exports.handler = async (event) => {
  try {

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Aucun body fourni" })
      };
    }

    let payload;
    try {
      payload = JSON.parse(event.body);
    } catch (parseErr) {
      console.error("Erreur JSON.parse :", parseErr);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Erreur de parsing JSON", raw: event.body })
      };
    }

    const { columns } = payload;

    if (!Array.isArray(columns)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Champ 'columns' invalide", value: columns })
      };
    }

    console.log("Envoi à Supabase :", columns);

    const { data, error } = await supabase
      .from('export_config')
      .upsert([{ id: 'singleton', columns, updated_at: new Date().toISOString() }]);

    if (error) {
      console.error("Erreur Supabase :", error);
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
    console.error("Erreur inattendue :", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
