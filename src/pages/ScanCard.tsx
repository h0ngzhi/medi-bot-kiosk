import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Camera, XCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useApp } from '@/contexts/AppContext';

type ScanState = 'scanning' | 'processing' | 'success' | 'error';

export default function ScanCard() {
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [errorMessage, setErrorMessage] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();
  const { setUser, t } = useApp();

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (!mounted) return;
            handleQRCodeScanned(decodedText);
          },
          () => {
            // QR code not detected - ignore
          }
        );
      } catch (err) {
        console.error('Camera error:', err);
        if (mounted) {
          setErrorMessage('Unable to access camera. Please allow camera permissions.');
          setScanState('error');
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleQRCodeScanned = async (qrData: string) => {
    // Stop the scanner
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(console.error);
    }

    setScanState('processing');

    // Parse QR code data - expecting format: "ID:name" or just use as ID
    const parts = qrData.split(':');
    const id = parts[0];
    const name = parts[1] || `User ${id.slice(-4)}`;

    // Simulate database lookup/creation
    setTimeout(() => {
      // Create user profile (in real app, this would check/create in database)
      const user = {
        id,
        name,
        nric: id,
        chasType: 'Blue' as const,
        points: 0, // New users start with 0 points
        participationHistory: [],
      };

      setUser(user);
      setScanState('success');

      setTimeout(() => {
        navigate('/language');
      }, 1500);
    }, 1000);
  };

  const handleRetry = () => {
    setErrorMessage('');
    setScanState('scanning');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in">
        <h1 className="text-display text-primary mb-4">{t('scan.title')}</h1>
        <p className="text-body-large text-muted-foreground max-w-md mx-auto">
          {t('scan.subtitle')}
        </p>
      </div>

      {/* Scanner Container */}
      <div 
        className="relative w-full max-w-md aspect-square bg-card rounded-3xl shadow-medium overflow-hidden animate-fade-in"
        style={{ animationDelay: '0.2s' }}
      >
        {scanState === 'scanning' && (
          <>
            {/* QR Scanner Video */}
            <div id="qr-reader" className="w-full h-full" />
            
            {/* Overlay with corners */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Scanning indicator */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 px-4 py-2 rounded-full">
                <Camera className="w-5 h-5 text-primary animate-pulse" />
                <span className="text-sm font-medium text-foreground">{t('scan.scanning')}</span>
              </div>
              
              {/* Corner markers */}
              <div className="absolute top-8 left-8 w-16 h-16 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
              <div className="absolute top-8 right-8 w-16 h-16 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
              <div className="absolute bottom-8 left-8 w-16 h-16 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
              <div className="absolute bottom-8 right-8 w-16 h-16 border-b-4 border-r-4 border-primary rounded-br-2xl" />
            </div>
          </>
        )}

        {scanState === 'processing' && (
          <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
            <Loader2 className="w-20 h-20 text-primary animate-spin" />
            <p className="text-heading text-foreground">{t('scan.loading')}</p>
          </div>
        )}

        {scanState === 'success' && (
          <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
            <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="w-16 h-16 text-success animate-check" />
            </div>
            <p className="text-heading text-success">{t('scan.success')}</p>
          </div>
        )}

        {scanState === 'error' && (
          <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
            <div className="w-24 h-24 rounded-full bg-destructive/20 flex items-center justify-center">
              <XCircle className="w-16 h-16 text-destructive" />
            </div>
            <p className="text-heading text-destructive text-center">{errorMessage}</p>
            <button
              onClick={handleRetry}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-full text-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      {scanState === 'scanning' && (
        <p className="mt-8 text-lg text-muted-foreground text-center max-w-sm">
          Position the QR code on your IC or CHAS card within the frame
        </p>
      )}
    </div>
  );
}
