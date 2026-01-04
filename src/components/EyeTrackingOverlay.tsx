import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, X, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEyeTracking } from '@/hooks/useEyeTracking';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface EyeTrackingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EyeTrackingOverlay({ isOpen, onClose }: EyeTrackingOverlayProps) {
  const [showCalibration, setShowCalibration] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [clickCounts, setClickCounts] = useState<Record<number, number>>({});
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  
  const {
    isCalibrating,
    isTracking,
    gazePosition,
    dwellProgress,
    error,
    startTracking,
    stopTracking,
    hideCalibrationUI,
  } = useEyeTracking({ dwellTime: 1200, enabled: trackingEnabled });

  // Calibration points (9 points grid)
  const calibrationPoints = [
    { x: 10, y: 10 },
    { x: 50, y: 10 },
    { x: 90, y: 10 },
    { x: 10, y: 50 },
    { x: 50, y: 50 },
    { x: 90, y: 50 },
    { x: 10, y: 90 },
    { x: 50, y: 90 },
    { x: 90, y: 90 },
  ];

  const handleStart = async () => {
    await startTracking();
    setTrackingEnabled(true);
    setShowCalibration(true);
    setCalibrationStep(0);
    setClickCounts({});
  };

  const handleCalibrationClick = (index: number) => {
    const newCounts = { ...clickCounts, [index]: (clickCounts[index] || 0) + 1 };
    setClickCounts(newCounts);
    
    // Need 5 clicks per point for good calibration
    if (newCounts[index] >= 5) {
      if (calibrationStep < calibrationPoints.length - 1) {
        setCalibrationStep(calibrationStep + 1);
      } else {
        // Calibration complete
        setShowCalibration(false);
        hideCalibrationUI();
      }
    }
  };

  const handleStop = () => {
    stopTracking();
    setTrackingEnabled(false);
    setShowCalibration(false);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      stopTracking();
      setShowCalibration(false);
    }
  }, [isOpen, stopTracking]);

  if (!isOpen) return null;

  return (
    <>
      {/* Gaze cursor */}
      {isTracking && gazePosition && !showCalibration && (
        <div
          className="fixed pointer-events-none z-[9999] transition-all duration-75"
          style={{
            left: gazePosition.x - 20,
            top: gazePosition.y - 20,
          }}
        >
          <div className="relative">
            {/* Outer ring with dwell progress */}
            <svg width="40" height="40" className="absolute">
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="hsl(var(--primary) / 0.3)"
                strokeWidth="3"
              />
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                strokeDasharray={`${dwellProgress * 113} 113`}
                strokeLinecap="round"
                transform="rotate(-90 20 20)"
                className="transition-all duration-100"
              />
            </svg>
            {/* Center dot */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-lg" />
          </div>
        </div>
      )}

      {/* Control dialog */}
      <Dialog open={isOpen && !isTracking && !isCalibrating} onOpenChange={() => !isTracking && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Eye className="w-6 h-6" />
              Eye Tracking Control
            </DialogTitle>
            <DialogDescription>
              Control the screen using your eyes. Look at buttons to click them.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-xl p-4 text-sm space-y-2">
              <p className="font-medium">How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Allow camera access when prompted</li>
                <li>Click on calibration points to train</li>
                <li>Look at buttons for 1.2 seconds to click</li>
              </ul>
            </div>
            
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm">
                {error}
              </div>
            )}
            
            <Button 
              onClick={handleStart}
              variant="warm"
              className="w-full h-14 text-lg"
            >
              <Eye className="w-5 h-5 mr-2" />
              Start Eye Tracking
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calibrating loader */}
      {isCalibrating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9998] flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
            <p className="text-xl font-medium">Starting camera...</p>
            <p className="text-muted-foreground">Please allow camera access</p>
          </div>
        </div>
      )}

      {/* Calibration screen */}
      {showCalibration && isTracking && (
        <div className="fixed inset-0 bg-background z-[9998]">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
            <h2 className="text-2xl font-bold">Calibration</h2>
            <p className="text-muted-foreground">
              Click on the blinking dot 5 times ({calibrationStep + 1}/{calibrationPoints.length})
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStop}
            className="absolute top-4 right-4 z-10"
          >
            <X className="w-6 h-6" />
          </Button>

          {calibrationPoints.map((point, index) => (
            <button
              key={index}
              onClick={() => handleCalibrationClick(index)}
              disabled={index !== calibrationStep}
              className={`absolute w-12 h-12 rounded-full transition-all duration-300 flex items-center justify-center ${
                index === calibrationStep
                  ? 'bg-primary animate-pulse scale-110'
                  : index < calibrationStep
                  ? 'bg-success scale-75'
                  : 'bg-muted scale-50'
              }`}
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {index === calibrationStep && (
                <Target className="w-6 h-6 text-primary-foreground" />
              )}
              {index < calibrationStep && (
                <span className="text-success-foreground text-sm">✓</span>
              )}
            </button>
          ))}
          
          {/* Click counter for current point */}
          {calibrationStep < calibrationPoints.length && (
            <div 
              className="absolute text-sm text-muted-foreground"
              style={{
                left: `${calibrationPoints[calibrationStep].x}%`,
                top: `calc(${calibrationPoints[calibrationStep].y}% + 40px)`,
                transform: 'translateX(-50%)',
              }}
            >
              {clickCounts[calibrationStep] || 0}/5 clicks
            </div>
          )}
        </div>
      )}

      {/* Active tracking controls */}
      {isTracking && !showCalibration && (
        <div className="fixed top-4 right-4 z-[9999] flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCalibration(true)}
            className="bg-card shadow-lg"
          >
            <Target className="w-4 h-4 mr-2" />
            Recalibrate
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleStop}
            className="shadow-lg"
          >
            <EyeOff className="w-4 h-4 mr-2" />
            Stop
          </Button>
        </div>
      )}
    </>
  );
}
