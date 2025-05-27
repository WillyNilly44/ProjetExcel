const { supabase } = require('./supabaseClient');

exports.handler = async () => {
  const { data, error } = await supabase
    .from('export_config')
    .select('columns')
    .eq('id', 'singleton')
    .single();

  if (error) {
    console.error("❌ Erreur Supabase (getExportColumns):", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ columns: data?.columns || [] })
  };
};
