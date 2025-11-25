import { useEffect } from 'react';

export default function CallbackHandler() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      console.error('OAuth error:', error);
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ 
          type: 'oauth-callback', 
          error 
        }, window.location.origin);
      }
      setTimeout(() => window.close(), 1000);
      return;
    }

    if (code) {
      // Send code to opener window
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ 
          type: 'oauth-callback', 
          code 
        }, window.location.origin);
        setTimeout(() => window.close(), 500);
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
