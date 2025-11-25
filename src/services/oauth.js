import { config } from '../config.js';

export async function getAgeVerificationCredential() {
  try {
    const requestUri = await pushedAuthorizationRequest();
    const code = await authorize(requestUri);
    const tokens = await exchangeCodeForTokens(code);
    const credential = await getCredential(tokens.access_token);
    
    console.log('Processing credential response...');
    console.log('credential.credentials:', credential.credentials);
    console.log('credential.credentials[0]:', credential.credentials?.[0]);
    
    const result = {
      credential: credential.credentials[0].credential,
      notification_id: credential.notification_id,
      timestamp: Date.now()
    };
    
    console.log('Final credential object to store:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('OAuth flow error:', error);
    throw new Error(`Failed to get credential: ${error.message}`);
  }
}

async function pushedAuthorizationRequest() {
  const url = `${config.oauth.baseUrl}${config.endpoints.pushedAuth}`;
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.oauth.clientId,
    scope: config.oauth.scope,
    redirect_uri: config.oauth.redirectUri
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString()
  });

  if (!response.ok) {
    throw new Error(`Pushed authorization failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.request_uri;
}

async function authorize(requestUri) {
  const authUrl = new URL(`${config.oauth.baseUrl}${config.endpoints.authorization}`);
  authUrl.searchParams.append('client_id', config.oauth.clientId);
  authUrl.searchParams.append('request_uri', requestUri);
  authUrl.searchParams.append('redirect_uri', config.oauth.redirectUri);

  // On mobile, use redirect flow instead of popup
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    // Store state to resume after redirect
    sessionStorage.setItem('oauth-in-progress', 'true');
    window.location.href = authUrl.toString();
    return new Promise(() => {}); // Will be resolved after redirect back
  }

  return new Promise((resolve, reject) => {
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      authUrl.toString(),
      'OAuth Authorization',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Listen for postMessage from callback
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data && event.data.type === 'oauth-callback' && event.data.code) {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkPopup);
        clearTimeout(timeout);
        resolve(event.data.code);
      }
    };

    window.addEventListener('message', handleMessage);

    // Fallback: check popup URL (for external redirect URIs)
    const checkPopup = setInterval(() => {
      try {
        if (popup.closed) {
          window.removeEventListener('message', handleMessage);
          clearInterval(checkPopup);
          clearTimeout(timeout);
          reject(new Error('Authorization cancelled'));
          return;
        }

        const popupUrl = popup.location.href;
        if (popupUrl.includes('code=')) {
          const url = new URL(popupUrl);
          const code = url.searchParams.get('code');
          window.removeEventListener('message', handleMessage);
          clearInterval(checkPopup);
          clearTimeout(timeout);
          popup.close();
          resolve(code);
        }
      } catch (e) {
        // Cross-origin errors are expected until redirect
      }
    }, 500);

    const timeout = setTimeout(() => {
      if (!popup.closed) {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkPopup);
        popup.close();
        reject(new Error('Authorization timeout'));
      }
    }, 300000);
  });
}

async function exchangeCodeForTokens(code) {
  const url = `${config.oauth.baseUrl}${config.endpoints.token}`;
  
  const formData = new FormData();
  formData.append('code', code);
  formData.append('grant_type', 'authorization_code');
  formData.append('client_id', config.oauth.clientId);
  formData.append('redirect_uri', config.oauth.redirectUri);

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return await response.json();
}

async function getCredential(accessToken) {
  const url = `${config.oauth.baseUrl}${config.endpoints.credential}`;
  
  const proof = {
    proof_type: 'jwt',
    jwt: "eyJ0eXAiOiJvcGVuaWQ0dmNpLXByb29mK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7Imt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4Ijoid1V1UDJPbHdIZWZlRS1ZMTZXajdQSEF6WjBKQVF5ZXZxV01mZDUtS21LWSIsInkiOiJZVy1iOE8zVWszTlVyazlvWnBBVDFsYVBlQWdpTlF3RGNvdFdpd0JGUTZFIn19.eyJhdWQiOiJodHRwczovL3ByZXByb2QuaXNzdWVyLmV1ZGl3LmRldi9vaWRjIiwibm9uY2UiOiJTcUdTMzc0eUFheFpIc254aUs5NWVnIiwiaWF0IjoxNzA0ODg2ODU1fQ.IdmxwbfJIKwcaqvADp6bzV2u-o0UwKIVmo_kQkc1rZHQ9MtBDNbO21NoVr99ZEgumTX8UYNFJcr_R95xfO1NiA"
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      credential_configuration_id: config.oauth.scope,
      proof: proof
    })
  });

  if (!response.ok) {
    throw new Error(`Credential request failed: ${response.statusText}`);
  }

  return await response.json();
}

export { exchangeCodeForTokens, getCredential };

