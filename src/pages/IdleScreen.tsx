import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Hand } from 'lucide-react';
import idleBackground from '@/assets/idle-background.png';

interface SlideItem {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  title: string | null;
  duration_seconds: number;
}

export default function IdleScreen() {
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();

  // Fetch active slides from database
  useEffect(() => {
    const fetchSlides = async () => {
      const { data, error } = await supabase
        .from('idle_slideshow')
        .select('id, media_url, media_type, title, duration_seconds')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        setSlides(data as SlideItem[]);
      }
    };

    fetchSlides();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('idle_slideshow_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'idle_slideshow' },
        () => {
          fetchSlides();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-advance slides
  useEffect(() => {
    if (slides.length <= 1) return;

    const currentSlide = slides[currentIndex];
    const duration = (currentSlide?.duration_seconds || 5) * 1000;

    const timer = setTimeout(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
        setIsTransitioning(false);
      }, 500); // Transition duration
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, slides]);

  // Handle tap to start
  const handleTapToStart = useCallback(() => {
    navigate('/scan');
  }, [navigate]);

  const currentSlide = slides[currentIndex];

  return (
    <div 
      className="min-h-screen w-full relative overflow-hidden cursor-pointer"
      onClick={handleTapToStart}
    >
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${idleBackground})` }}
      />
      {/* Slideshow Content */}
      {slides.length > 0 && currentSlide ? (
        <div 
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {currentSlide.media_type === 'video' ? (
            <video
              key={currentSlide.id}
              src={currentSlide.media_url}
              autoPlay
              muted
              loop
              playsInline
              className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-xl"
            />
          ) : (
            <img
              key={currentSlide.id}
              src={currentSlide.media_url}
              alt={currentSlide.title || 'Community Programme'}
              className="max-w-[90%] max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-xl"
            />
          )}

        </div>
      ) : (
        // Default content when no slides
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
          <div className="text-center space-y-6">
            <div className="w-32 h-32 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
              <img 
                src="/favicon.png" 
                alt="Community Care" 
                className="w-20 h-20 object-contain"
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-primary">
              Singapore Community Care
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
              Empowering Singaporeans to care for ourselves and one another
            </p>
          </div>
        </div>
      )}

      {/* Slide indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-primary w-8' 
                  : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* Tap to start overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <div className="flex flex-col items-center justify-center animate-pulse">
          <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center shadow-lg mb-4">
            <Hand className="w-10 h-10 text-primary-foreground" />
          </div>
          <p className="text-2xl font-semibold text-primary bg-white/80 px-6 py-2 rounded-full shadow-md">
            Tap anywhere to start
          </p>
        </div>
      </div>

      {/* Admin link (small, bottom-right) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate('/admin');
        }}
        className="absolute bottom-4 right-4 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        Admin
      </button>
    </div>
  );
}
