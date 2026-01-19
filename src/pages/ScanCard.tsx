import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Camera, XCircle, Keyboard, Trash2, Shield, Pencil } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ScanState = 'scanning' | 'processing' | 'success' | 'error';

interface ExistingUser {
  id: string;
  name: string;
  user_id: string;
  chas_card_type: string | null;
  date_of_birth: string | null;
  gender: string | null;
  events_attended: number;
  points: number;
  is_admin?: boolean;
}

export default function ScanCard() {
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [errorMessage, setErrorMessage] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualNric, setManualNric] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualChasType, setManualChasType] = useState('Blue');
  const [manualDob, setManualDob] = useState('');
  const [manualGender, setManualGender] = useState<'male' | 'female'>('male');
  const [manualPoints, setManualPoints] = useState('0');
  const [manualEventsAttended, setManualEventsAttended] = useState('0');
  const [isAdmin, setIsAdmin] = useState(false);
  const [existingUsers, setExistingUsers] = useState<ExistingUser[]>([]);
  const [userToDelete, setUserToDelete] = useState<ExistingUser | null>(null);
  const [userToEdit, setUserToEdit] = useState<ExistingUser | null>(null);
  const [editPoints, setEditPoints] = useState('');
  const [editEvents, setEditEvents] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
  const navigate = useNavigate();
  const { setUser, t } = useApp();

  // Fetch existing users when manual entry dialog opens
  const fetchExistingUsers = async () => {
    const { data: users } = await supabase
      .from('kiosk_users')
      .select('id, name, user_id, chas_card_type, date_of_birth, gender, events_attended, points')
      .order('updated_at', { ascending: false })
      .limit(5);
    
    if (users) {
      // Check admin status for each user
      const usersWithAdminStatus = await Promise.all(
        users.map(async (user) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();
          
          return {
            ...user,
            is_admin: !!roleData
          };
        })
      );
      setExistingUsers(usersWithAdminStatus);
    }
  };

  useEffect(() => {
    if (showManualEntry) {
      fetchExistingUsers();
    }
  }, [showManualEntry]);

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

  // Validate date format (YYYY-MM-DD)
  const validateDob = (dob: string): boolean => {
    if (!dob) return true; // Optional field
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dob)) return false;
    const date = new Date(dob);
    return !isNaN(date.getTime()) && date < new Date();
  };

  // Parse and validate QR code data
  // Expected format: NRIC:NAME:CHAS_TYPE:DOB:GENDER
  // Example: S1234567A:Tan Ah Kow:Blue:1955-03-15:male
  const parseQRCode = (qrData: string): { nric: string; name: string; chasType: string; dob?: string; gender?: 'male' | 'female' } | null => {
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
    const dob = parts[3]?.trim() || undefined;
    const genderRaw = parts[4]?.trim().toLowerCase() || undefined;

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

    // Validate DOB if provided
    if (dob && !validateDob(dob)) {
      return null;
    }

    // Validate and parse gender
    let gender: 'male' | 'female' | undefined = undefined;
    if (genderRaw === 'male' || genderRaw === 'female') {
      gender = genderRaw;
    }

    // Capitalize CHAS type properly
    const formattedChasType = chasType.charAt(0).toUpperCase() + chasType.slice(1).toLowerCase();

    return { nric, name: sanitizedName, chasType: formattedChasType, dob, gender };
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
      setErrorMessage('Invalid card format. Expected format: NRIC:Name:CHAS Type:DOB:Gender (e.g., S1234567A:Tan Ah Kow:Blue:1955-03-15:male)');
      setScanState('error');
      return;
    }

    const { nric, name, chasType, dob, gender: qrGender } = parsed;

    try {
      // Check if user already exists in database
      let { data: existingUser, error: fetchError } = await supabase
        .from('kiosk_users')
        .select('*')
        .eq('user_id', nric)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let kioskUser = existingUser;
      let isNewUser = false;

      // If not found, create new user with scanned CHAS type
      if (!kioskUser) {
        isNewUser = true;
        // Use custom points and events if set via manual entry
        const startingPoints = parseInt(manualPoints) || 0;
        const startingEvents = parseInt(manualEventsAttended) || 0;
        // Use DOB from QR code or manual entry
        const dateOfBirth = dob || manualDob || null;
        // Use gender from QR code or manual entry
        const userGender = qrGender || manualGender;
        const { data: newUser, error: insertError } = await supabase
          .from('kiosk_users')
          .insert({
            user_id: nric,
            name: name,
            chas_card_type: chasType.toLowerCase(),
            date_of_birth: dateOfBirth,
            gender: userGender,
            points: startingPoints,
            events_attended: startingEvents,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        kioskUser = newUser;

        // If admin checkbox was checked, add admin role
        if (isAdmin) {
          await supabase
            .from('user_roles')
            .insert({ user_id: kioskUser.id, role: 'admin' });
        }

        // Auto-populate sample data for new users
        await populateNewUserData(kioskUser.id);
      } else {
        // Update existing user's name, CHAS type, and DOB if different
        const newDob = dob || manualDob || null;
        const needsUpdate = 
          kioskUser.chas_card_type?.toLowerCase() !== chasType.toLowerCase() ||
          kioskUser.name !== name ||
          (newDob && kioskUser.date_of_birth !== newDob);
        
        if (needsUpdate) {
          const updateData: Record<string, string> = { 
            chas_card_type: chasType.toLowerCase(),
            name: name 
          };
          if (newDob) {
            updateData.date_of_birth = newDob;
          }
          const { data: updatedUser, error: updateError } = await supabase
            .from('kiosk_users')
            .update(updateData)
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

      // Fetch all user data from related tables
      const [signupsResult, medicationsResult, screeningsResult, screeningResultsData] = await Promise.all([
        supabase
          .from('user_programme_signups')
          .select(`
            programme_id,
            signed_up_at,
            status,
            community_programmes (title)
          `)
          .eq('kiosk_user_id', kioskUser.id),
        supabase
          .from('medications')
          .select('*')
          .eq('kiosk_user_id', kioskUser.id),
        supabase
          .from('health_screenings')
          .select('*')
          .eq('kiosk_user_id', kioskUser.id),
        supabase
          .from('screening_results')
          .select('*')
          .eq('kiosk_user_id', kioskUser.id)
      ]);

      const participationHistory = signupsResult.data?.map(s => {
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

      console.log('User loaded:', {
        isNewUser,
        medications: medicationsResult.data?.length || 0,
        screenings: screeningsResult.data?.length || 0,
        screeningResults: screeningResultsData.data?.length || 0,
        signups: signupsResult.data?.length || 0
      });

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

  // Populate sample data for new users in all related tables
  const populateNewUserData = async (kioskUserId: string) => {
    const today = new Date();
    const pastDate1 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const pastDate2 = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
    const futureDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

    try {
      // 1. Add sample health screenings
      await supabase.from('health_screenings').insert([
        {
          kiosk_user_id: kioskUserId,
          title: 'Annual Health Check',
          description: 'Comprehensive health screening',
          scheduled_date: futureDate.toISOString().split('T')[0],
          status: 'upcoming',
          location: 'Bedok Polyclinic'
        },
        {
          kiosk_user_id: kioskUserId,
          title: 'Blood Pressure Check',
          description: 'Routine BP monitoring',
          scheduled_date: pastDate1.toISOString().split('T')[0],
          completed_at: pastDate1.toISOString(),
          status: 'completed',
          location: 'Tampines Polyclinic'
        }
      ]);

      // 2. Add sample screening results
      await supabase.from('screening_results').insert([
        {
          kiosk_user_id: kioskUserId,
          screening_type: 'blood_pressure',
          systolic: 125,
          diastolic: 82,
          pulse: 72,
          status: 'normal',
          recorded_at: pastDate1.toISOString()
        },
        {
          kiosk_user_id: kioskUserId,
          screening_type: 'weight',
          height: 165,
          weight: 68,
          bmi: 25.0,
          status: 'normal',
          recorded_at: pastDate1.toISOString()
        },
        {
          kiosk_user_id: kioskUserId,
          screening_type: 'blood_pressure',
          systolic: 130,
          diastolic: 85,
          pulse: 75,
          status: 'normal',
          recorded_at: pastDate2.toISOString()
        }
      ]);

      // 3. Add sample medications
      await supabase.from('medications').insert([
        {
          kiosk_user_id: kioskUserId,
          name: 'Amlodipine 5mg',
          dosage: 'Take 1 tablet daily',
          price_per_box: 12.50,
          tablets_per_box: 30,
          subsidy_percent: 50,
          delivery_status: 'delivered',
          delivery_method: 'home',
          is_current: false,
          order_completed_at: pastDate1.toISOString(),
          delivery_date: pastDate1.toISOString().split('T')[0]
        },
        {
          kiosk_user_id: kioskUserId,
          name: 'Metformin 500mg',
          dosage: 'Take 1 tablet twice daily',
          price_per_box: 8.00,
          tablets_per_box: 60,
          subsidy_percent: 50,
          delivery_status: 'pending',
          is_current: true
        }
      ]);

      // Note: Not auto-signing up to programmes - let users register themselves

      console.log('Sample data populated for new user');
    } catch (error) {
      console.error('Error populating sample data:', error);
      // Don't throw - user creation succeeded, sample data is optional
    }
  };

  const handleRetry = () => {
    setErrorMessage('');
    setScanState('scanning');
    window.location.reload();
  };

  const handleQuickSelect = async (user: ExistingUser) => {
    const chasType = user.chas_card_type 
      ? user.chas_card_type.charAt(0).toUpperCase() + user.chas_card_type.slice(1)
      : 'Blue';
    
    // Quick Select should NOT modify points/events - just log in with existing data
    // Points/events editing is done via the Edit dialog (pencil icon)
    const qrData = `${user.user_id}:${user.name}:${chasType}`;
    setShowManualEntry(false);
    handleQRCodeScanned(qrData);
  };

  const handleDeleteUser = async (user: ExistingUser) => {
    try {
      // Delete user roles first (cascade should handle this, but be explicit)
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);
      
      // Delete the user (cascades to all related tables)
      const { error } = await supabase
        .from('kiosk_users')
        .delete()
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success(`User ${user.name} deleted successfully`);
      setUserToDelete(null);
      fetchExistingUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleOpenEditUser = (user: ExistingUser) => {
    setUserToEdit(user);
    setEditPoints(String(user.points));
    setEditEvents(String(user.events_attended));
  };

  const handleSaveEditUser = async () => {
    if (!userToEdit) return;
    
    try {
      const updates: Record<string, number> = {};
      const newPoints = parseInt(editPoints);
      const newEvents = parseInt(editEvents);
      
      if (!isNaN(newPoints)) updates.points = newPoints;
      if (!isNaN(newEvents)) updates.events_attended = newEvents;
      
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('kiosk_users')
          .update(updates)
          .eq('id', userToEdit.id);
        
        if (error) throw error;
        
        toast.success(`Updated ${userToEdit.name}'s stats`);
        fetchExistingUsers();
      }
      
      setUserToEdit(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const formatChasTypeDisplay = (type: string | null): string => {
    if (!type) return 'Blue';
    const lower = type.toLowerCase();
    if (lower === 'merdeka generation') return 'Merdeka';
    if (lower === 'pioneer generation') return 'Pioneer';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handleManualSubmit = () => {
    if (!manualNric.trim() || !manualName.trim()) {
      return;
    }
    // Include DOB and gender in QR data
    let qrData = `${manualNric.trim()}:${manualName.trim()}:${manualChasType}`;
    if (manualDob) {
      qrData += `:${manualDob}`;
    } else {
      qrData += `:`;  // Empty DOB placeholder
    }
    qrData += `:${manualGender}`;
    setShowManualEntry(false);
    handleQRCodeScanned(qrData);
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

      {/* Instructions and Manual Entry */}
      {scanState === 'scanning' && (
        <div className="mt-8 text-center">
          <p className="text-lg text-muted-foreground max-w-sm mb-6">
            Position the QR code on your IC or CHAS card within the frame
          </p>
          
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowManualEntry(true)}
            className="h-14 px-6 text-base gap-2"
          >
            <Keyboard className="w-5 h-5" />
            Enter Manually (For Testers)
          </Button>
        </div>
      )}

      {/* Manual Entry Dialog */}
      <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Manual Entry</DialogTitle>
            <DialogDescription className="text-base">
              Select an existing user or enter new credentials
            </DialogDescription>
            <div className="mt-2 p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium text-foreground mb-1">QR Code Format:</p>
              <code className="text-primary font-mono">NRIC:NAME:CHAS_TYPE:DOB:GENDER</code>
              <p className="text-muted-foreground mt-1 text-xs">
                Example: S1234567A:Tan Ah Kow:Blue:1955-03-15:male
              </p>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Quick Select Existing Users */}
            {existingUsers.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Quick Select</label>
                <div className="space-y-2">
                  {existingUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuickSelect(user)}
                        className="flex-1 p-3 text-left rounded-lg border border-border hover:bg-accent hover:border-primary transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground flex items-center gap-2">
                              {user.name}
                              {user.is_admin && (
                                <Shield className="w-4 h-4 text-amber-500" />
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.user_id}</p>
                            <p className="text-xs text-muted-foreground">
                              {user.points} pts • {user.events_attended} events
                              {user.gender && ` • ${user.gender.charAt(0).toUpperCase() + user.gender.slice(1)}`}
                              {user.date_of_birth && ` • Born ${user.date_of_birth}`}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                            {formatChasTypeDisplay(user.chas_card_type)}
                          </span>
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditUser(user)}
                        className="h-10 w-10 text-primary hover:bg-primary/10"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setUserToDelete(user)}
                        className="h-10 w-10 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or enter manually
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">NRIC / FIN</label>
              <Input
                value={manualNric}
                onChange={(e) => setManualNric(e.target.value.toUpperCase())}
                placeholder="S1234567A"
                className="h-12 text-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <Input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Tan Ah Kow"
                className="h-12 text-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">CHAS Card Type</label>
              <select
                value={manualChasType}
                onChange={(e) => setManualChasType(e.target.value)}
                className="w-full h-12 text-lg px-3 rounded-md border border-input bg-background"
              >
                <option value="Blue">Blue</option>
                <option value="Orange">Orange</option>
                <option value="Green">Green</option>
                <option value="Merdeka generation">Merdeka Generation</option>
                <option value="Pioneer generation">Pioneer Generation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Date of Birth</label>
              <Input
                type="date"
                value={manualDob}
                onChange={(e) => setManualDob(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="h-12 text-lg"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Required for age-adjusted health thresholds (e.g., 65+ seniors)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Gender</label>
              <select
                value={manualGender}
                onChange={(e) => setManualGender(e.target.value as 'male' | 'female')}
                className="w-full h-12 text-lg px-3 rounded-md border border-input bg-background"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Required for gender-adjusted BMI and BP thresholds
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Starting Points (For Testing)</label>
              <Input
                type="number"
                value={manualPoints}
                onChange={(e) => setManualPoints(e.target.value)}
                placeholder="50"
                min="0"
                className="h-12 text-lg"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set custom points for new users or update existing users on Quick Select
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Events Attended (For Testing)</label>
              <Input
                type="number"
                value={manualEventsAttended}
                onChange={(e) => setManualEventsAttended(e.target.value)}
                placeholder="0"
                min="0"
                className="h-12 text-lg"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set events attended for reward tier testing
              </p>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border bg-amber-50 dark:bg-amber-950/20">
              <Checkbox
                id="isAdmin"
                checked={isAdmin}
                onCheckedChange={(checked) => setIsAdmin(checked === true)}
              />
              <div className="flex-1">
                <label htmlFor="isAdmin" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <Shield className="w-4 h-4 text-amber-500" />
                  Create as Admin
                </label>
                <p className="text-xs text-muted-foreground">
                  Admins can comment on any finished programme
                </p>
              </div>
            </div>
            
            <Button
              variant="default"
              size="lg"
              onClick={handleManualSubmit}
              disabled={!manualNric.trim() || !manualName.trim()}
              className="w-full h-14 text-lg mt-4"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{userToDelete?.name}</strong> and all their data 
              (signups, feedback, screenings, etc.). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && handleDeleteUser(userToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit User Dialog */}
      <Dialog open={!!userToEdit} onOpenChange={(open) => !open && setUserToEdit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit User Stats</DialogTitle>
            <DialogDescription className="text-base">
              Update points and events for <strong>{userToEdit?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Points</label>
              <Input
                type="number"
                value={editPoints}
                onChange={(e) => setEditPoints(e.target.value)}
                min="0"
                className="h-12 text-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Events Attended</label>
              <Input
                type="number"
                value={editEvents}
                onChange={(e) => setEditEvents(e.target.value)}
                min="0"
                className="h-12 text-lg"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setUserToEdit(null)}
                className="flex-1 h-12"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="lg"
                onClick={handleSaveEditUser}
                className="flex-1 h-12"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}