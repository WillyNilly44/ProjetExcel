// SSO Configuration for your company
export const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_AZURE_CLIENT_ID || 'your-company-app-id',
    authority: 'https://login.microsoftonline.com/your-company-tenant-id',
    redirectUri: process.env.REACT_APP_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  }
};

export const loginRequest = {
  scopes: ["User.Read", "profile", "openid", "email"]
};