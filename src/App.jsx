import { useState, useEffect } from 'react';
import AgeVerification from './components/AgeVerification.jsx';
import CredentialManager from './components/CredentialManager.jsx';
import QRScanner from './components/QRScanner.jsx';
import CallbackHandler from './components/CallbackHandler.jsx';

function App() {
  const [step, setStep] = useState('age-check');
  const [credentials, setCredentials] = useState([]);
  const [isGettingCredential, setIsGettingCredential] = useState(false);

  // Check if this is a callback URL
  const basePath = import.meta.env.BASE_URL || '/';
  const urlParams = new URLSearchParams(window.location.search);
  const redirectPath = urlParams.get('redirect');
  
  // Handle GitHub Pages SPA routing
  const isCallback = redirectPath?.includes('callback') || 
                     window.location.pathname === `${basePath}callback` || 
                     window.location.pathname.endsWith('/callback');

  useEffect(() => {
    const stored = localStorage.getItem('av-credentials');
    if (stored) {
      try {
        setCredentials(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse credentials', e);
      }
    }

    // Check if returning from OAuth on mobile
    const oauthCode = sessionStorage.getItem('oauth-code');
    const oauthError = sessionStorage.getItem('oauth-error');
    
    console.log('[App] oauth-code:', oauthCode ? 'present' : 'missing');
    console.log('[App] oauth-error:', oauthError);
    
    if (oauthCode || oauthError) {
      console.log('[App] OAuth completed, navigating to credential-manager');
      setIsGettingCredential(true);
      setStep('credential-manager');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('av-credentials', JSON.stringify(credentials));
  }, [credentials]);

  const handleAgeConfirmed = () => {
    setIsGettingCredential(true);
    setStep('credential-manager');
  };

  const handleCredentialAdded = (credential) => {
    setCredentials(prev => [...prev, credential]);
    setIsGettingCredential(false);
    setStep('scanner');
  };

  const handleCredentialError = () => {
    setIsGettingCredential(false);
  };

  const handleScanComplete = () => {
    setStep('credential-manager');
    setIsGettingCredential(false);
  };

  // If this is a callback, render the callback handler
  if (isCallback) {
    // Extract query params from redirect if present
    let callbackParams = window.location.search;
    if (redirectPath && redirectPath.includes('?')) {
      callbackParams = '?' + redirectPath.split('?')[1];
    }
    return <CallbackHandler queryString={callbackParams} />;
  }

  return (
    <div className="app">
      {step === 'age-check' && (
        <AgeVerification onConfirm={handleAgeConfirmed} />
      )}
      
      {step === 'credential-manager' && (
        <CredentialManager 
          credentials={credentials}
          onAddCredential={handleCredentialAdded}
          onError={handleCredentialError}
          onScan={() => setStep('scanner')}
          autoStart={isGettingCredential}
        />
      )}

      {step === 'scanner' && (
        <QRScanner 
          credentials={credentials}
          onComplete={handleScanComplete}
          onBack={() => setStep('credential-manager')}
        />
      )}
    </div>
  );
}

export default App;
