import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Trash2, 
  GripVertical, 
  Image as ImageIcon, 
  Video,
  Plus,
  Eye,
  Loader2,
  Monitor,
  LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner';

// Helper to convert seconds to minutes and seconds
const secondsToMinSec = (totalSeconds: number) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return { mins, secs };
};

// Helper to convert minutes and seconds to total seconds
const minSecToSeconds = (mins: number, secs: number) => {
  return mins * 60 + secs;
};

interface SlideItem {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  title: string | null;
  display_order: number;
  is_active: boolean;
  duration_seconds: number;
}

interface DashboardSlideItem extends SlideItem {
  position: 'left' | 'right';
}

export default function AdminSlideshow() {
  const [idleSlides, setIdleSlides] = useState<SlideItem[]>([]);
  const [dashboardSlides, setDashboardSlides] = useState<DashboardSlideItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });
  const [activeTab, setActiveTab] = useState('idle');
  const navigate = useNavigate();

  // Get current screen dimensions
  useEffect(() => {
    const updateScreenSize = () => {
      setScreenSize({
        width: window.screen.width,
        height: window.screen.height
      });
    };
    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // Fetch idle slides
  const fetchIdleSlides = useCallback(async () => {
    const { data, error } = await supabase
      .from('idle_slideshow')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data) {
      setIdleSlides(data as SlideItem[]);
    }
  }, []);

  // Fetch dashboard slides
  const fetchDashboardSlides = useCallback(async () => {
    const { data, error } = await supabase
      .from('dashboard_slideshow')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data) {
      setDashboardSlides(data as DashboardSlideItem[]);
    }
  }, []);

  useEffect(() => {
    fetchIdleSlides();
    fetchDashboardSlides();
  }, [fetchIdleSlides, fetchDashboardSlides]);

  // Handle file upload for idle slideshow
  const handleIdleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isVideo && !isImage) {
          toast.error(`Unsupported file type: ${file.name}`);
          continue;
        }

        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('slideshow-media')
          .upload(fileName, file);

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('slideshow-media')
          .getPublicUrl(uploadData.path);

        const maxOrder = idleSlides.length > 0 
          ? Math.max(...idleSlides.map(s => s.display_order)) 
          : -1;

        const { error: insertError } = await supabase
          .from('idle_slideshow')
          .insert({
            media_url: urlData.publicUrl,
            media_type: isVideo ? 'video' : 'image',
            title: file.name.replace(/\.[^/.]+$/, ''),
            display_order: maxOrder + 1,
            duration_seconds: isVideo ? 30 : 5,
          });

        if (insertError) {
          toast.error(`Failed to save ${file.name}: ${insertError.message}`);
        } else {
          toast.success(`Uploaded ${file.name}`);
        }
      }

      fetchIdleSlides();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file upload for dashboard slideshow
  const handleDashboardFileUpload = async (files: FileList | null, position: 'left' | 'right') => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isVideo && !isImage) {
          toast.error(`Unsupported file type: ${file.name}`);
          continue;
        }

        const fileName = `dashboard-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('slideshow-media')
          .upload(fileName, file);

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('slideshow-media')
          .getPublicUrl(uploadData.path);

        const positionSlides = dashboardSlides.filter(s => s.position === position);
        const maxOrder = positionSlides.length > 0 
          ? Math.max(...positionSlides.map(s => s.display_order)) 
          : -1;

        const { error: insertError } = await supabase
          .from('dashboard_slideshow')
          .insert({
            media_url: urlData.publicUrl,
            media_type: isVideo ? 'video' : 'image',
            title: file.name.replace(/\.[^/.]+$/, ''),
            display_order: maxOrder + 1,
            duration_seconds: isVideo ? 30 : 5,
            position,
          });

        if (insertError) {
          toast.error(`Failed to save ${file.name}: ${insertError.message}`);
        } else {
          toast.success(`Uploaded ${file.name} to ${position} panel`);
        }
      }

      fetchDashboardSlides();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent, type: 'idle' | 'dashboard', position?: 'left' | 'right') => {
    e.preventDefault();
    setIsDragging(false);
    if (type === 'idle') {
      handleIdleFileUpload(e.dataTransfer.files);
    } else if (position) {
      handleDashboardFileUpload(e.dataTransfer.files, position);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Handle reordering for idle slides
  const handleIdleDragStart = (id: string) => {
    setDraggedItem(id);
  };

  const handleIdleDragEnd = async (targetId: string) => {
    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null);
      return;
    }

    const draggedIndex = idleSlides.findIndex(s => s.id === draggedItem);
    const targetIndex = idleSlides.findIndex(s => s.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    const newSlides = [...idleSlides];
    const [removed] = newSlides.splice(draggedIndex, 1);
    newSlides.splice(targetIndex, 0, removed);

    const updates = newSlides.map((slide, index) => ({
      ...slide,
      display_order: index,
    }));

    setIdleSlides(updates);
    setDraggedItem(null);

    for (const slide of updates) {
      await supabase
        .from('idle_slideshow')
        .update({ display_order: slide.display_order })
        .eq('id', slide.id);
    }
  };

  // Toggle slide active status
  const toggleIdleActive = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('idle_slideshow')
      .update({ is_active: !currentValue })
      .eq('id', id);

    if (!error) {
      setIdleSlides(prev => 
        prev.map(s => s.id === id ? { ...s, is_active: !currentValue } : s)
      );
    }
  };

  const toggleDashboardActive = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('dashboard_slideshow')
      .update({ is_active: !currentValue })
      .eq('id', id);

    if (!error) {
      setDashboardSlides(prev => 
        prev.map(s => s.id === id ? { ...s, is_active: !currentValue } : s)
      );
    }
  };

  // Update slide title
  const updateIdleTitle = async (id: string, title: string) => {
    await supabase
      .from('idle_slideshow')
      .update({ title })
      .eq('id', id);

    setIdleSlides(prev => 
      prev.map(s => s.id === id ? { ...s, title } : s)
    );
  };

  const updateDashboardTitle = async (id: string, title: string) => {
    await supabase
      .from('dashboard_slideshow')
      .update({ title })
      .eq('id', id);

    setDashboardSlides(prev => 
      prev.map(s => s.id === id ? { ...s, title } : s)
    );
  };

  // Update slide duration
  const updateIdleDuration = async (id: string, duration: number) => {
    await supabase
      .from('idle_slideshow')
      .update({ duration_seconds: duration })
      .eq('id', id);

    setIdleSlides(prev => 
      prev.map(s => s.id === id ? { ...s, duration_seconds: duration } : s)
    );
  };

  const updateDashboardDuration = async (id: string, duration: number) => {
    await supabase
      .from('dashboard_slideshow')
      .update({ duration_seconds: duration })
      .eq('id', id);

    setDashboardSlides(prev => 
      prev.map(s => s.id === id ? { ...s, duration_seconds: duration } : s)
    );
  };

  // Delete slide
  const deleteIdleSlide = async (id: string, mediaUrl: string) => {
    const { error } = await supabase
      .from('idle_slideshow')
      .delete()
      .eq('id', id);

    if (!error) {
      const fileName = mediaUrl.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('slideshow-media')
          .remove([fileName]);
      }

      setIdleSlides(prev => prev.filter(s => s.id !== id));
      toast.success('Slide deleted');
    } else {
      toast.error('Failed to delete slide');
    }
  };

  const deleteDashboardSlide = async (id: string, mediaUrl: string) => {
    const { error } = await supabase
      .from('dashboard_slideshow')
      .delete()
      .eq('id', id);

    if (!error) {
      const fileName = mediaUrl.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('slideshow-media')
          .remove([fileName]);
      }

      setDashboardSlides(prev => prev.filter(s => s.id !== id));
      toast.success('Slide deleted');
    } else {
      toast.error('Failed to delete slide');
    }
  };

  // Render slide card
  const renderSlideCard = (
    slide: SlideItem | DashboardSlideItem,
    type: 'idle' | 'dashboard'
  ) => {
    const isIdle = type === 'idle';
    
    return (
      <Card 
        key={slide.id}
        className={`transition-all ${
          draggedItem === slide.id ? 'opacity-50 scale-95' : ''
        } ${!slide.is_active ? 'opacity-60' : ''}`}
        draggable={isIdle}
        onDragStart={isIdle ? () => handleIdleDragStart(slide.id) : undefined}
        onDragOver={isIdle ? (e) => e.preventDefault() : undefined}
        onDrop={isIdle ? () => handleIdleDragEnd(slide.id) : undefined}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {isIdle && (
              <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                <GripVertical className="w-4 h-4" />
              </div>
            )}

            <div className="w-20 h-14 bg-muted rounded-lg overflow-hidden flex-shrink-0">
              {slide.media_type === 'video' ? (
                <video
                  src={slide.media_url}
                  className="w-full h-full object-cover"
                  muted
                />
              ) : (
                <img
                  src={slide.media_url}
                  alt={slide.title || 'Slide'}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                {slide.media_type === 'video' ? (
                  <Video className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <ImageIcon className="w-3 h-3 text-muted-foreground" />
                )}
                <Input
                  value={slide.title || ''}
                  onChange={(e) => isIdle 
                    ? updateIdleTitle(slide.id, e.target.value)
                    : updateDashboardTitle(slide.id, e.target.value)
                  }
                  placeholder="Slide title"
                  className="h-7 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Duration</Label>
                <Input
                  type="number"
                  value={secondsToMinSec(slide.duration_seconds).mins}
                  onChange={(e) => {
                    const mins = parseInt(e.target.value) || 0;
                    const secs = secondsToMinSec(slide.duration_seconds).secs;
                    isIdle 
                      ? updateIdleDuration(slide.id, minSecToSeconds(mins, secs))
                      : updateDashboardDuration(slide.id, minSecToSeconds(mins, secs));
                  }}
                  min={0}
                  max={59}
                  className="w-12 h-6 text-xs text-center"
                />
                <span className="text-xs text-muted-foreground">m</span>
                <Input
                  type="number"
                  value={secondsToMinSec(slide.duration_seconds).secs}
                  onChange={(e) => {
                    const mins = secondsToMinSec(slide.duration_seconds).mins;
                    const secs = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                    isIdle 
                      ? updateIdleDuration(slide.id, minSecToSeconds(mins, secs))
                      : updateDashboardDuration(slide.id, minSecToSeconds(mins, secs));
                  }}
                  min={0}
                  max={59}
                  className="w-12 h-6 text-xs text-center"
                />
                <span className="text-xs text-muted-foreground">s</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={slide.is_active}
                onCheckedChange={() => isIdle 
                  ? toggleIdleActive(slide.id, slide.is_active)
                  : toggleDashboardActive(slide.id, slide.is_active)
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => isIdle 
                  ? deleteIdleSlide(slide.id, slide.media_url)
                  : deleteDashboardSlide(slide.id, slide.media_url)
                }
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render upload area
  const renderUploadArea = (
    type: 'idle' | 'dashboard',
    position?: 'left' | 'right'
  ) => (
    <Card 
      className={`border-2 border-dashed transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
      }`}
      onDrop={(e) => handleDrop(e, type, position)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <CardContent className="p-6">
        <div className="text-center">
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Video className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                Drag and drop files here
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                or click to select
              </p>
              {type === 'idle' && (
                <div className="flex items-center justify-center gap-1 mb-3 text-xs bg-muted/50 px-3 py-1 rounded-lg">
                  <Monitor className="w-3 h-3 text-primary" />
                  <span className="text-muted-foreground">
                    Min: <strong className="text-foreground">{screenSize.width} × {screenSize.height}px</strong>
                  </span>
                </div>
              )}
              {type === 'dashboard' && (
                <div className="flex items-center justify-center gap-1 mb-3 text-xs bg-muted/50 px-3 py-1 rounded-lg">
                  <Monitor className="w-3 h-3 text-primary" />
                  <span className="text-muted-foreground">
                    Vertical format recommended
                  </span>
                </div>
              )}
              <label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => type === 'idle' 
                    ? handleIdleFileUpload(e.target.files)
                    : position && handleDashboardFileUpload(e.target.files, position)
                  }
                />
                <Button asChild variant="outline" size="sm" className="gap-1">
                  <span>
                    <Plus className="w-3 h-3" />
                    Add Files
                  </span>
                </Button>
              </label>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const leftSlides = dashboardSlides.filter(s => s.position === 'left');
  const rightSlides = dashboardSlides.filter(s => s.position === 'right');

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Slideshow Management</h1>
            <p className="text-muted-foreground">Manage slideshows for idle screen and dashboard</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview Idle
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <LayoutGrid className="w-4 h-4" />
            Preview Dashboard
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="idle" className="gap-2">
              <Monitor className="w-4 h-4" />
              Idle Screen ({idleSlides.length})
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              Dashboard ({dashboardSlides.length})
            </TabsTrigger>
          </TabsList>

          {/* Idle Screen Tab */}
          <TabsContent value="idle" className="space-y-4">
            {renderUploadArea('idle')}
            
            <h2 className="text-lg font-semibold text-foreground">
              Idle Screen Slides ({idleSlides.length})
            </h2>
            
            {idleSlides.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No slides yet. Upload images or videos to get started.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {idleSlides.map((slide) => renderSlideCard(slide, 'idle'))}
              </div>
            )}
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Left Panel */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  Left Panel ({leftSlides.length})
                </h2>
                {renderUploadArea('dashboard', 'left')}
                
                {leftSlides.length === 0 ? (
                  <Card>
                    <CardContent className="p-4 text-center text-muted-foreground text-sm">
                      No slides for left panel
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {leftSlides.map((slide) => renderSlideCard(slide, 'dashboard'))}
                  </div>
                )}
              </div>

              {/* Right Panel */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  Right Panel ({rightSlides.length})
                </h2>
                {renderUploadArea('dashboard', 'right')}
                
                {rightSlides.length === 0 ? (
                  <Card>
                    <CardContent className="p-4 text-center text-muted-foreground text-sm">
                      No slides for right panel
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {rightSlides.map((slide) => renderSlideCard(slide, 'dashboard'))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}