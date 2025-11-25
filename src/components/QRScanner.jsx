import { useState, useRef, useEffect } from 'react';
import { submitVerificationResponse } from '../services/verifier.js';
import jsQR from 'jsqr';

export default function QRScanner({ credentials, onComplete, onBack }) {
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (scanIntervalRef.current) {
        cancelAnimationFrame(scanIntervalRef.current);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadedmetadata', () => {
          startScanning();
        });
      }
    } catch (err) {
      setError('Camera access denied. Please use the paste button to enter QR code data.');
      setScanning(false);
    }
  };

  const startScanning = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          processQRData(code.data);
          return;
        }
      }
      scanIntervalRef.current = requestAnimationFrame(scan);
    };
    
    scanIntervalRef.current = requestAnimationFrame(scan);
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      cancelAnimationFrame(scanIntervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const handleManualInput = async (e) => {
    e.preventDefault();
    const input = e.target.qrdata.value;
    if (input) {
      setShowPasteModal(false);
      await processQRData(input);
    }
  };

  const processQRData = async (data) => {
    setProcessing(true);
    setError(null);
    
    try {
      if (!credentials || credentials.length === 0) {
        throw new Error('No credentials available. Please obtain a credential first.');
      }

      const credential = credentials[0];
      await submitVerificationResponse(data, credential);
      
      setResult('Verification submitted successfully!');
      stopCamera();
      setScanning(false);
      
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="qr-scanner-page">
      <div className="header">
        <button onClick={onBack} className="back-button">←</button>
        <h1>Lilith's Age Verification Wallet</h1>
        <button onClick={() => setShowPasteModal(true)} className="paste-button">📋</button>
      </div>

      <div className="qr-scanner-container">
        {error && (
          <div className="error" style={{ margin: '1rem' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div style={{ 
            background: 'var(--success)', 
            color: 'white', 
            padding: '1rem', 
            borderRadius: '0.75rem',
            margin: '1rem'
          }}>
            {result}
          </div>
        )}

        {scanning && (
          <div className="qr-scanner-fullscreen">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              className="qr-video"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="scan-overlay">
              <div className="scan-frame"></div>
              <p className="scan-instruction">Position QR code within the frame</p>
            </div>
          </div>
        )}

        {processing && (
          <div className="loading" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <div className="spinner"></div>
            <p>Processing verification...</p>
          </div>
        )}
      </div>

      {showPasteModal && (
        <div className="paste-modal-overlay" onClick={() => setShowPasteModal(false)}>
          <div className="paste-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Paste QR Code URL</h3>
            <form onSubmit={handleManualInput}>
              <textarea 
                name="qrdata"
                placeholder="av://?...."
                autoFocus
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '1rem',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="submit" style={{ flex: 1 }}>Submit</button>
                <button type="button" onClick={() => setShowPasteModal(false)} style={{ flex: 1, background: 'var(--bg-tertiary)' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
