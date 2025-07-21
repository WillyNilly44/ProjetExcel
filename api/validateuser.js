
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, error: 'No token provided' })
      };
    }

    const token = authHeader.split(' ')[1];
    
    // Simple token validation (in production, use JWT verification)
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const [userId, timestamp] = decoded.split(':');
      
      // Check if token is not too old (24 hours)
      const tokenAge = Date.now() - parseInt(timestamp);
      if (tokenAge > 24 * 60 * 60 * 1000) {
        return {
          statusCode: 401,
          body: JSON.stringify({ success: false, error: 'Token expired' })
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
      };
    } catch (e) {
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, error: 'Invalid token' })
      };
    }

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};