import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, CheckCircle2, Loader2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

type ScanState = 'idle' | 'scanning' | 'success' | 'loading';

export default function ScanCard() {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const navigate = useNavigate();
  const { setUser, t } = useApp();

  // Simulate card scan on click
  const handleScan = () => {
    if (scanState !== 'idle') return;
    
    setScanState('scanning');
    
    // Simulate scanning delay
    setTimeout(() => {
      setScanState('success');
      
      // Simulate loading profile
      setTimeout(() => {
        setScanState('loading');
        
        // Create mock user profile
        const mockUser = {
          id: 'user-001',
          name: 'Mdm. Tan Mei Ling',
          nric: 'S1234567A',
          chasType: 'Blue' as const,
          points: 450,
          participationHistory: [
            'Health Talk: Diabetes Prevention',
            'Digital Wellness Workshop',
            'Morning Exercise Class',
          ],
        };
        
        setUser(mockUser);
        
        setTimeout(() => {
          navigate('/language');
        }, 1000);
      }, 1500);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-8">
      {/* Header */}
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-display text-primary mb-4">{t('scan.title')}</h1>
        <p className="text-body-large text-muted-foreground max-w-md mx-auto">
          {t('scan.subtitle')}
        </p>
      </div>

      {/* Scanner Card */}
      <button
        onClick={handleScan}
        disabled={scanState !== 'idle'}
        className="relative w-full max-w-md aspect-[1.6/1] bg-card rounded-3xl shadow-medium overflow-hidden transition-all duration-500 hover:shadow-glow hover:-translate-y-2 focus:outline-none focus:ring-4 focus:ring-primary/30 animate-fade-in"
        style={{ animationDelay: '0.2s' }}
      >
        {/* Card background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary" />
          <div className="absolute top-4 left-4 w-16 h-10 rounded-lg bg-primary/30" />
          <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary/30" />
        </div>

        {/* Scan line animation */}
        {scanState === 'scanning' && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center gap-6 p-8">
          {scanState === 'idle' && (
            <>
              <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center animate-float">
                <CreditCard className="w-12 h-12 text-primary" />
              </div>
              <p className="text-heading text-foreground">{t('scan.instruction')}</p>
            </>
          )}

          {scanState === 'scanning' && (
            <>
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <p className="text-heading text-foreground">{t('scan.scanning')}</p>
            </>
          )}

          {scanState === 'success' && (
            <>
              <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="w-16 h-16 text-success animate-check" />
              </div>
              <p className="text-heading text-success">{t('scan.success')}</p>
            </>
          )}

          {scanState === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <p className="text-heading text-foreground">{t('scan.loading')}</p>
            </>
          )}
        </div>

        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary/30 rounded-tl-3xl" />
        <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary/30 rounded-tr-3xl" />
        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary/30 rounded-bl-3xl" />
        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary/30 rounded-br-3xl" />
      </button>

      {/* Tap hint */}
      {scanState === 'idle' && (
        <p className="mt-8 text-lg text-muted-foreground animate-pulse-slow">
          Tap to simulate scan
        </p>
      )}
    </div>
  );
}
