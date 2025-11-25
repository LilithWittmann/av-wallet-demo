import { createDeviceResponse } from './mdoc.js';

export async function submitVerificationResponse(qrData, credential) {
  try {
    console.log('Parsing QR code:', qrData.substring(0, 100) + '...');
    const params = parseQRCode(qrData);
    console.log('Parsed params:', params);
    console.log('DCQL credentials:', params.dcql_query?.credentials);
    
    if (!params.response_uri) {
      throw new Error('No response_uri found in QR code');
    }

    console.log('Creating VP token for credential:', credential);
    const vpToken = await createVPToken(credential, params);
    console.log('VP Token (raw):', vpToken);
    console.log('VP Token type:', typeof vpToken);
    
    // Use the state parameter from the QR code URL parameters
    // This is the state value that the backend expects to match the authorization request
    if (!params.state) {
      throw new Error('No state parameter found in QR code');
    }
    
    // Create the request payload
    const payload = {
      vp_token: vpToken,
      state: params.state
    };
    
    console.log('Submitting to:', params.response_uri);
    console.log('Payload:', payload);
    console.log('State being sent:', params.state);
    console.log('VP Token structure:', JSON.stringify(vpToken, null, 2).substring(0, 500));
    
    // Verify the vp_token structure
    Object.keys(vpToken).forEach(key => {
      console.log(`VP Token[${key}]:`, Array.isArray(vpToken[key]), 'Array length:', vpToken[key]?.length);
      if (Array.isArray(vpToken[key])) {
        vpToken[key].forEach((item, idx) => {
          console.log(`  Element[${idx}] type:`, typeof item, 'is string?', typeof item === 'string');
        });
      }
    });
    
    // The backend expects application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('vp_token', JSON.stringify(vpToken));
    formData.append('state', params.state);
    
    console.log('Form data:', formData.toString().substring(0, 500));
    
    const response = await fetch(params.response_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (!response.ok) {
      throw new Error(`Verification failed: ${response.status} ${response.statusText} - ${responseText}`);
    }

    try {
      return JSON.parse(responseText);
    } catch (e) {
      return { success: true, response: responseText };
    }
  } catch (error) {
    console.error('Verification error:', error);
    throw new Error(`Failed to submit verification: ${error.message}`);
  }
}

function parseQRCode(qrData) {
  try {
    let url;
    
    // Handle av:// protocol by replacing it with https://dummy
    if (qrData.startsWith('av://')) {
      // Replace av:// with https://dummy to make it parseable
      url = new URL(qrData.replace('av://', 'https://dummy/'));
    } else if (qrData.startsWith('openid4vp://')) {
      url = new URL(qrData.replace('openid4vp://', 'https://dummy/'));
    } else {
      url = new URL(qrData);
    }

    const params = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    if (params.dcql_query) {
      try {
        params.dcql_query = JSON.parse(decodeURIComponent(params.dcql_query));
      } catch (e) {
        console.error('Failed to parse dcql_query:', e);
      }
    }

    // Extract state from the response_uri path if not present as a parameter
    // The state should be in the URL parameters, but if missing, extract from response_uri
    if (!params.state && params.response_uri) {
      const responseUri = params.response_uri;
      const parts = responseUri.split('/');
      const stateFromUri = parts[parts.length - 1];
      params.state = stateFromUri;
      console.log('Extracted state from response_uri:', params.state);
    } else if (params.state) {
      console.log('Using state from URL parameters:', params.state);
    }

    return params;
  } catch (error) {
    throw new Error(`Invalid QR code format: ${error.message}`);
  }
}

async function createVPToken(credential, params) {
  console.log('Full credential object:', JSON.stringify(credential, null, 2));
  console.log('credential.credential type:', typeof credential.credential);
  console.log('credential.credential value:', credential.credential?.substring?.(0, 100) || credential.credential);
  console.log('DCQL query:', JSON.stringify(params.dcql_query, null, 2));
  
  // Extract the credential ID from the DCQL query
  const credentialId = params.dcql_query?.credentials?.[0]?.id;
  console.log('Credential ID from DCQL:', credentialId);
  
  if (!credentialId) {
    console.warn('No credential ID found in DCQL query, using raw credential');
    return credential.credential;
  }
  
  // The credential from the issuer is IssuerSigned data
  // We need to wrap it in a DeviceResponse structure
  console.log('Creating DeviceResponse from IssuerSigned credential');
  const deviceResponse = await createDeviceResponse(credential.credential, params);
  console.log('DeviceResponse created, length:', deviceResponse.length);
  console.log('DeviceResponse preview:', deviceResponse.substring(0, 100));
  
  // Build the VP token structure
  // According to OpenAPI spec: vp_token is an object where keys are credential IDs
  // and values are strings (base64url-encoded DeviceResponse)
  const vpToken = {};
  vpToken[credentialId] = deviceResponse;
  
  console.log('VP Token structure created');
  console.log('Credential ID key:', credentialId);
  console.log('Value type:', typeof vpToken[credentialId]);
  console.log('Is string?:', typeof vpToken[credentialId] === 'string');
  console.log('String length:', vpToken[credentialId].length);
  console.log('String preview:', vpToken[credentialId].substring(0, 100));
  
  return vpToken;
}
