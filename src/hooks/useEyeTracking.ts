import { useState, useEffect, useCallback, useRef } from 'react';

interface GazePrediction {
  x: number;
  y: number;
}

interface UseEyeTrackingOptions {
  dwellTime?: number; // Time in ms to trigger a click
  enabled?: boolean;
}

export function useEyeTracking({ dwellTime = 1500, enabled = false }: UseEyeTrackingOptions = {}) {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [gazePosition, setGazePosition] = useState<GazePrediction | null>(null);
  const [hoveredElement, setHoveredElement] = useState<Element | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const dwellStartTime = useRef<number | null>(null);
  const lastElement = useRef<Element | null>(null);
  const animationFrame = useRef<number | null>(null);
  const webgazerRef = useRef<any>(null);

  const startTracking = useCallback(async () => {
    try {
      setError(null);
      setIsCalibrating(true);
      
      // Dynamically import webgazer
      const webgazer = (await import('webgazer')).default;
      webgazerRef.current = webgazer;
      
      // Configure webgazer
      webgazer.params.showVideoPreview = true;
      webgazer.params.showFaceOverlay = true;
      webgazer.params.showFaceFeedbackBox = true;
      
      // Start webgazer with gaze listener
      await webgazer
        .setRegression('ridge')
        .setGazeListener((data: GazePrediction | null) => {
          if (data) {
            setGazePosition({ x: data.x, y: data.y });
          }
        })
        .begin();
      
      // Show prediction points during calibration
      webgazer.showPredictionPoints(true);
      
      setIsCalibrating(false);
      setIsTracking(true);
      
    } catch (err) {
      console.error('Error starting eye tracking:', err);
      setError(err instanceof Error ? err.message : 'Failed to start eye tracking');
      setIsCalibrating(false);
    }
  }, []);

  const stopTracking = useCallback(() => {
    if (webgazerRef.current) {
      webgazerRef.current.end();
      webgazerRef.current = null;
    }
    setIsTracking(false);
    setGazePosition(null);
    setHoveredElement(null);
    setDwellProgress(0);
    dwellStartTime.current = null;
    lastElement.current = null;
  }, []);

  const hideCalibrationUI = useCallback(() => {
    if (webgazerRef.current) {
      webgazerRef.current.showVideoPreview(false);
      webgazerRef.current.showPredictionPoints(false);
      webgazerRef.current.showFaceOverlay(false);
      webgazerRef.current.showFaceFeedbackBox(false);
    }
  }, []);

  const showCalibrationUI = useCallback(() => {
    if (webgazerRef.current) {
      webgazerRef.current.showVideoPreview(true);
      webgazerRef.current.showPredictionPoints(true);
    }
  }, []);

  // Handle dwell clicking
  useEffect(() => {
    if (!enabled || !isTracking || !gazePosition) return;

    const checkDwell = () => {
      const elementAtGaze = document.elementFromPoint(gazePosition.x, gazePosition.y);
      
      // Find the closest clickable element
      const clickable = elementAtGaze?.closest('button, a, [role="button"], [data-eye-clickable]');
      
      if (clickable && clickable === lastElement.current) {
        // Still looking at the same element
        if (dwellStartTime.current) {
          const elapsed = Date.now() - dwellStartTime.current;
          const progress = Math.min(elapsed / dwellTime, 1);
          setDwellProgress(progress);
          
          if (elapsed >= dwellTime) {
            // Trigger click
            (clickable as HTMLElement).click();
            dwellStartTime.current = null;
            setDwellProgress(0);
            lastElement.current = null;
          }
        }
      } else {
        // Looking at a different element
        lastElement.current = clickable || null;
        setHoveredElement(clickable || null);
        dwellStartTime.current = clickable ? Date.now() : null;
        setDwellProgress(0);
      }
      
      animationFrame.current = requestAnimationFrame(checkDwell);
    };
    
    animationFrame.current = requestAnimationFrame(checkDwell);
    
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [enabled, isTracking, gazePosition, dwellTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webgazerRef.current) {
        webgazerRef.current.end();
      }
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, []);

  return {
    isCalibrating,
    isTracking,
    gazePosition,
    hoveredElement,
    dwellProgress,
    error,
    startTracking,
    stopTracking,
    hideCalibrationUI,
    showCalibrationUI,
  };
}
