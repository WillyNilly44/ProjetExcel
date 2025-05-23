const { supabase } = require('./supabaseClient');
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const boundary = event.headers['content-type'].split('boundary=')[1];
    const bodyBuffer = Buffer.from(event.body, 'base64');

    const fileStart = bodyBuffer.indexOf(Buffer.from('Content-Type:'));
    const headerEnd = bodyBuffer.indexOf('\r\n\r\n', fileStart) + 4;
    const fileEnd = bodyBuffer.indexOf(Buffer.from(`--${boundary}`), headerEnd);
    const fileBuffer = bodyBuffer.slice(headerEnd, fileEnd);

    const fileName = `excel-${uuidv4()}.xlsx`;

    const { error: uploadError } = await supabase.storage
      .from('secure-excel')
      .upload(fileName, fileBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      });

    if (uploadError) {
      return { statusCode: 500, body: JSON.stringify({ error: uploadError.message }) };
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('secure-excel')
      .createSignedUrl(fileName, 60 * 60);

    if (signedUrlError) {
      return { statusCode: 500, body: JSON.stringify({ error: signedUrlError.message }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ url: signedUrlData.signedUrl }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Unknown error' }),
    };
  }
};
