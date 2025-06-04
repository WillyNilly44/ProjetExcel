const { supabase } = require('./supabaseClient');

exports.handler = async () => {
  try {
    const { data, error } = await supabase.storage
      .from('secure-excel')
      .list('', { sortBy: { column: 'created_at', order: 'desc' } });

    if (error || !data || data.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Aucun fichier trouvé dans Supabase' })
      };
    }

    const latestFile = data[0];

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('secure-excel')
      .createSignedUrl(latestFile.name, 60 * 60);

    if (signedUrlError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: signedUrlError.message })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ url: signedUrlData.signedUrl })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Erreur inconnue' })
    };
  }
};
