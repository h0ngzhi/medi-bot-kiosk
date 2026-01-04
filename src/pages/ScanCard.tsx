import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Camera, XCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';

type ScanState = 'scanning' | 'processing' | 'success' | 'error';

export default function ScanCard() {
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [errorMessage, setErrorMessage] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
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
        isRunningRef.current = true;
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
      if (scannerRef.current && isRunningRef.current) {
        scannerRef.current.stop().then(() => {
          isRunningRef.current = false;
        }).catch(console.error);
      }
    };
  }, []);

  // Validate Singapore NRIC/FIN format
  const validateNRIC = (nric: string): boolean => {
    // Singapore NRIC/FIN format: [STFGM] + 7 digits + checksum letter
    const nricRegex = /^[STFGM]\d{7}[A-Z]$/;
    return nricRegex.test(nric.toUpperCase());
  };

  // Sanitize name input
  const sanitizeName = (name: string): string => {
    // Remove control characters and trim
    let sanitized = name
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control chars
      .trim();
    
    // Limit length to 100 characters
    if (sanitized.length > 100) {
      sanitized = sanitized.slice(0, 100);
    }
    
    return sanitized;
  };

  // Parse and validate QR code data
  // Expected format: NRIC:NAME:CHAS_TYPE
  // Example: S1234567A:Tan Ah Kow:Blue
  const parseQRCode = (qrData: string): { nric: string; name: string; chasType: string } | null => {
    // Length check - reject extremely long inputs
    if (!qrData || qrData.length === 0 || qrData.length > 300) {
      return null;
    }

    // Split by colon
    const parts = qrData.split(':');
    
    if (parts.length < 3) {
      // Not enough parts - invalid format
      return null;
    }

    const nric = parts[0].trim().toUpperCase();
    const name = parts[1].trim();
    const chasType = parts[2].trim();

    // Validate NRIC format
    if (!validateNRIC(nric)) {
      return null;
    }

    // Sanitize and validate name
    const sanitizedName = sanitizeName(name);
    if (!sanitizedName || sanitizedName.length === 0) {
      return null;
    }

    // Validate CHAS type
    const validChasTypes = ['blue', 'orange', 'green', 'merdeka generation', 'pioneer generation'];
    const normalizedChasType = chasType.toLowerCase();
    if (!validChasTypes.includes(normalizedChasType)) {
      return null;
    }

    // Capitalize CHAS type properly
    const formattedChasType = chasType.charAt(0).toUpperCase() + chasType.slice(1).toLowerCase();

    return { nric, name: sanitizedName, chasType: formattedChasType };
  };

  const handleQRCodeScanned = async (qrData: string) => {
    // Stop the scanner
    if (scannerRef.current && isRunningRef.current) {
      await scannerRef.current.stop().catch(console.error);
      isRunningRef.current = false;
    }

    setScanState('processing');

    // Parse and validate QR code data
    const parsed = parseQRCode(qrData);
    
    if (!parsed) {
      setErrorMessage('Invalid card format. Expected format: NRIC:Name:CHAS Type (e.g., S1234567A:Tan Ah Kow:Blue)');
      setScanState('error');
      return;
    }

    const { nric, name, chasType } = parsed;

    try {
      // Check if user already exists in database
      let { data: existingUser, error: fetchError } = await supabase
        .from('kiosk_users')
        .select('*')
        .eq('user_id', nric)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let kioskUser = existingUser;

      // If not found, create new user with scanned CHAS type
      if (!kioskUser) {
        const { data: newUser, error: insertError } = await supabase
          .from('kiosk_users')
          .insert({
            user_id: nric,
            name: name,
            chas_card_type: chasType.toLowerCase(),
            points: 0,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        kioskUser = newUser;
      } else {
        // Update existing user's name and CHAS type if different
        const needsUpdate = 
          kioskUser.chas_card_type?.toLowerCase() !== chasType.toLowerCase() ||
          kioskUser.name !== name;
        
        if (needsUpdate) {
          const { data: updatedUser, error: updateError } = await supabase
            .from('kiosk_users')
            .update({ 
              chas_card_type: chasType.toLowerCase(),
              name: name 
            })
            .eq('id', kioskUser.id)
            .select()
            .single();
          
          if (!updateError && updatedUser) {
            kioskUser = updatedUser;
          }
        }
      }

      // Format CHAS type properly for display
      const formatChasType = (type: string): 'Blue' | 'Orange' | 'Green' | 'Merdeka generation' | 'Pioneer generation' => {
        const lower = type?.toLowerCase() || 'blue';
        if (lower === 'merdeka generation') return 'Merdeka generation';
        if (lower === 'pioneer generation') return 'Pioneer generation';
        return (lower.charAt(0).toUpperCase() + lower.slice(1)) as 'Blue' | 'Orange' | 'Green';
      };

      // Fetch participation history from programme signups
      const { data: signups } = await supabase
        .from('user_programme_signups')
        .select(`
          programme_id,
          signed_up_at,
          status,
          community_programmes (title)
        `)
        .eq('kiosk_user_id', kioskUser.id);

      const participationHistory = signups?.map(s => {
        const programme = s.community_programmes as { title: string } | null;
        return programme?.title || 'Community Programme';
      }) || [];

      // Create user profile with database ID
      const user = {
        id: kioskUser.id, // UUID from database
        name: kioskUser.name,
        nric: kioskUser.user_id,
        chasType: formatChasType(kioskUser.chas_card_type || 'blue'),
        points: kioskUser.points,
        participationHistory,
      };

      setUser(user);
      setScanState('success');

      setTimeout(() => {
        navigate('/language');
      }, 1500);
    } catch (error) {
      console.error('Error creating/fetching user:', error);
      setErrorMessage('Unable to process card. Please try again.');
      setScanState('error');
    }
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
