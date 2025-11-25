import { useState } from 'react';

export default function AgeVerification({ onConfirm }) {
  const [showTrustMe, setShowTrustMe] = useState(false);

  const handleNo = () => {
    setShowTrustMe(true);
  };

  const handleYes = () => {
    onConfirm();
  };

  const handleTrustMe = () => {
    onConfirm();
  };

  return (
    <div className="container">
      <h1>Age Verification Demo</h1>
      <h2>Are you over 18 years old?</h2>
      
      {!showTrustMe ? (
        <div className="button-group">
          <button onClick={handleYes}>Yes</button>
          <button onClick={handleNo}>No</button>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--error)' }}>
            You must be at least 18 years old to enter this site.
          </p>
          <button onClick={handleTrustMe}>Yeah, trust me</button>
        </>
      )}
    </div>
  );
}
