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
  const isCallback = window.location.pathname === '/callback';

  useEffect(() => {
    const stored = localStorage.getItem('av-credentials');
    if (stored) {
      try {
        setCredentials(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse credentials', e);
      }
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
    return <CallbackHandler />;
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
