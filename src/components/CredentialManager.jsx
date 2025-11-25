import { useState, useEffect, useRef } from 'react';
import { getAgeVerificationCredential } from '../services/oauth.js';

export default function CredentialManager({ credentials, onAddCredential, onError, onScan, autoStart = false }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) return;
    
    // Check for OAuth code from mobile redirect
    const code = sessionStorage.getItem('oauth-code');
    const oauthError = sessionStorage.getItem('oauth-error');
    
    console.log('[CredentialManager] useEffect - code:', code ? 'present' : 'missing');
    console.log('[CredentialManager] useEffect - error:', oauthError);
    console.log('[CredentialManager] useEffect - autoStart:', autoStart);
    
    if (code) {
      console.log('[CredentialManager] Processing OAuth code from mobile redirect');
      hasProcessedRef.current = true;
      sessionStorage.removeItem('oauth-code');
      handleOAuthCode(code);
    } else if (oauthError) {
      sessionStorage.removeItem('oauth-error');
      setError(`Authorization failed: ${oauthError}`);
    } else if (autoStart) {
      console.log('[CredentialManager] Auto-starting credential request');
      hasProcessedRef.current = true;
      handleGetCredential();
    }
  }, []);

  const handleOAuthCode = async (code) => {
    setLoading(true);
    setError(null);
    
    try {
      const { exchangeCodeForTokens, getCredential } = await import('../services/oauth.js');
      const tokens = await exchangeCodeForTokens(code);
      const credentialResponse = await getCredential(tokens.access_token);
      
      const credential = {
        credential: credentialResponse.credentials[0].credential,
        notification_id: credentialResponse.notification_id,
        timestamp: Date.now()
      };
      
      onAddCredential(credential);
    } catch (err) {
      setError(err.message);
      if (onError) {
        onError();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGetCredential = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const credential = await getAgeVerificationCredential();
      onAddCredential(credential);
    } catch (err) {
      setError(err.message);
      if (onError) {
        onError();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Lilith's Age Verification Wallet</h1>
      </div>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Getting credential...</p>
        </div>
      ) : (
        <div className="button-group">
          <button onClick={handleGetCredential}>
            Get Age Verification Credential
          </button>
          <button onClick={onScan}>
            Scan QR Code
          </button>
        </div>
      )}

      {credentials.length > 0 && (
        <div className="credential-list">
          <h3 style={{ marginBottom: '1rem' }}>Your Credentials ({credentials.length})</h3>
          {credentials.map((cred, idx) => (
            <div key={idx} className="credential-item">
              <div className="credential-header">
                <span className="credential-id">#{idx + 1}</span>
                <span className="credential-badge">Valid</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Obtained: {new Date(cred.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="info-box">
        <h3>About this demo</h3>
        <p>
          This demo shows the EU age verification system flow. Click "Get Age Verification Credential" 
          to obtain a credential from the trust service provider, or scan a QR code to verify your age.
        </p>
      </div>
    </div>
  );
}
