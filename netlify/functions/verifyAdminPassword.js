exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { password } = JSON.parse(event.body);
    const adminPassword = process.env.ADMIN_PASSWORD;           
    const superAdminPassword = process.env.ADMIN_PASSWORD_LVL;  
    
    let isValid = false;
    let level = '';
    
    if (password === adminPassword) {
      isValid = true; 
      level = 'threshold';
    } else if (password === superAdminPassword) {
      isValid = true; 
      level = 'full';
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        valid: isValid,
        level: level
      }),
    };
  } catch (err) {
    console.error('Verify password error:', err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request' }),
    };
  }
};