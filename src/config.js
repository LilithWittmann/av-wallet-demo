const getRedirectUri = () => {
  if (import.meta.env.VITE_REDIRECT_URI) {
    return import.meta.env.VITE_REDIRECT_URI;
  }
  
  if (typeof window !== 'undefined') {
    const base = import.meta.env.BASE_URL || '/';
    return `${window.location.origin}${base}callback`;
  }
  
  return 'https://credentials.dev';
};

export const config = {
  oauth: {
    baseUrl: import.meta.env.VITE_OAUTH_BASE_URL || 'https://issuer.ageverification.dev',
    clientId: import.meta.env.VITE_CLIENT_ID || 'wallet-app',
    redirectUri: getRedirectUri(),
    scope: import.meta.env.VITE_SCOPE || 'eu.europa.ec.eudi.age_verification_mdoc'
  },
  endpoints: {
    pushedAuth: import.meta.env.VITE_PUSHED_AUTH_ENDPOINT || '/pushed_authorizationv2',
    authorization: import.meta.env.VITE_AUTHORIZATION_ENDPOINT || '/authorizationV3',
    token: import.meta.env.VITE_TOKEN_ENDPOINT || '/token_service',
    credential: import.meta.env.VITE_CREDENTIAL_ENDPOINT || '/credential'
  }
};
