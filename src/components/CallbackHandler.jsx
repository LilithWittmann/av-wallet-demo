import { useEffect } from 'react';

export default function CallbackHandler() {
  useEffect(() => {
    console.log('[CallbackHandler] Starting callback processing');
    console.log('[CallbackHandler] window.opener:', window.opener);
    
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    console.log('[CallbackHandler] code:', code ? 'present' : 'missing');
    console.log('[CallbackHandler] error:', error);

    if (error) {
      console.error('OAuth error:', error);
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ 
          type: 'oauth-callback', 
          error 
        }, window.location.origin);
        setTimeout(() => window.close(), 1000);
      } else {
        console.log('[CallbackHandler] Mobile flow - storing error');
        // Mobile redirect flow - store error and redirect back
        sessionStorage.setItem('oauth-error', error);
        sessionStorage.removeItem('oauth-in-progress');
        const basePath = import.meta.env.BASE_URL || '/';
        console.log('[CallbackHandler] Redirecting to:', window.location.origin + basePath);
        window.location.href = window.location.origin + basePath;
      }
      return;
    }

    if (code) {
      // Send code to opener window (desktop popup flow)
      if (window.opener && !window.opener.closed) {
        console.log('[CallbackHandler] Desktop flow - sending to opener');
        window.opener.postMessage({ 
          type: 'oauth-callback', 
          code 
        }, window.location.origin);
        setTimeout(() => window.close(), 500);
      } else {
        console.log('[CallbackHandler] Mobile flow - storing code and redirecting');
        // Mobile redirect flow - store code and redirect back
        sessionStorage.setItem('oauth-code', code);
        sessionStorage.removeItem('oauth-in-progress');
        const basePath = import.meta.env.BASE_URL || '/';
        console.log('[CallbackHandler] Redirecting to:', window.location.origin + basePath);
        window.location.href = window.location.origin + basePath;
      }
    }
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div className="spinner"></div>
      <p>Processing authorization...</p>
    </div>
  );
}
