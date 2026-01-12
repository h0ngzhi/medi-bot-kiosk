import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AUTH_KEY = 'prototype_auth_token';
const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface PrototypeGateProps {
  children: React.ReactNode;
}

function isValidToken(token: string | null): boolean {
  if (!token) return false;
  
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  
  const timestamp = parseInt(parts[0], 10);
  if (isNaN(timestamp)) return false;
  
  // Check if token has expired (24 hours)
  const age = Date.now() - timestamp;
  if (age > TOKEN_MAX_AGE_MS || age < 0) return false;
  
  return true;
}

export const PrototypeGate = ({ children }: PrototypeGateProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem(AUTH_KEY);
    if (isValidToken(token)) {
      setIsAuthenticated(true);
    } else {
      // Clear invalid token
      sessionStorage.removeItem(AUTH_KEY);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('verify-prototype-access', {
        body: { password }
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.success && data?.token) {
        sessionStorage.setItem(AUTH_KEY, data.token);
        setIsAuthenticated(true);
      } else {
        setError(data?.error || 'Incorrect password');
        setPassword('');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      
      // Handle rate limiting
      if (err?.message?.includes('429') || err?.status === 429) {
        setError('Too many attempts. Please wait a minute.');
      } else {
        setError('Verification failed. Please try again.');
      }
      setPassword('');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Prototype Access</CardTitle>
          <p className="text-muted-foreground text-sm">
            Enter the password to access this prototype
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-center text-lg"
                autoFocus
                disabled={isVerifying}
              />
              {error && (
                <p className="text-destructive text-sm text-center">{error}</p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={isVerifying || !password}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Access Prototype'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
