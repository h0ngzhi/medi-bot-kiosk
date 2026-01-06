import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseVoiceInputOptions {
  language?: string;
  onTranscript?: (text: string) => void;
  autoStopMs?: number; // Auto-stop after this many ms of recording
}

export function useVoiceInput({ 
  language = 'en', 
  onTranscript,
  autoStopMs = 10000 // Default 10 seconds max recording
}: UseVoiceInputOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoStopRef = useRef<NodeJS.Timeout | null>(null);

  // Timer for recording duration display
  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    // Clear auto-stop timer
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }

    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        setIsRecording(false);
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);
        setError(null);

        try {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          
          // Check if we have any audio data
          if (audioBlob.size < 1000) {
            setError('Recording too short. Please try again.');
            setIsProcessing(false);
            resolve(null);
            return;
          }

          // Convert to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          
          reader.onloadend = async () => {
            try {
              const base64Audio = (reader.result as string).split(',')[1];
              
              const { data, error: fnError } = await supabase.functions.invoke('transcribe-audio', {
                body: { audio: base64Audio, language }
              });

              if (fnError) {
                throw fnError;
              }

              if (data?.text) {
                onTranscript?.(data.text);
                resolve(data.text);
              } else if (data?.error) {
                throw new Error(data.error);
              } else {
                resolve(null);
              }
            } catch (err) {
              console.error('Transcription error:', err);
              setError('Could not transcribe audio. Please try again.');
              resolve(null);
            } finally {
              setIsProcessing(false);
            }
          };
        } catch (err) {
          console.error('Error processing audio:', err);
          setError('Error processing audio');
          setIsProcessing(false);
          resolve(null);
        }

        // Stop all tracks
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.stop();
    });
  }, [language, onTranscript]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms for smoother processing
      setIsRecording(true);

      // Auto-stop after max duration
      autoStopRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, autoStopMs);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  }, [autoStopMs, stopRecording]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      return await stopRecording();
    } else {
      await startRecording();
      return null;
    }
  }, [isRecording, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoStopRef.current) {
        clearTimeout(autoStopRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    isRecording,
    isProcessing,
    error,
    recordingTime,
    startRecording,
    stopRecording,
    toggleRecording
  };
}
