import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Upload, 
  Trash2, 
  GripVertical, 
  Image as ImageIcon, 
  Video,
  Plus,
  Eye,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface SlideItem {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  title: string | null;
  display_order: number;
  is_active: boolean;
  duration_seconds: number;
}

export default function AdminSlideshow() {
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch all slides
  const fetchSlides = useCallback(async () => {
    const { data, error } = await supabase
      .from('idle_slideshow')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data) {
      setSlides(data as SlideItem[]);
    }
  }, []);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
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

        // Upload to storage
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('slideshow-media')
          .upload(fileName, file);

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('slideshow-media')
          .getPublicUrl(uploadData.path);

        // Get max display order
        const maxOrder = slides.length > 0 
          ? Math.max(...slides.map(s => s.display_order)) 
          : -1;

        // Insert into database
        const { error: insertError } = await supabase
          .from('idle_slideshow')
          .insert({
            media_url: urlData.publicUrl,
            media_type: isVideo ? 'video' : 'image',
            title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for title
            display_order: maxOrder + 1,
            duration_seconds: isVideo ? 30 : 5,
          });

        if (insertError) {
          toast.error(`Failed to save ${file.name}: ${insertError.message}`);
        } else {
          toast.success(`Uploaded ${file.name}`);
        }
      }

      fetchSlides();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle drag and drop for file upload
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Handle reordering
  const handleDragStart = (id: string) => {
    setDraggedItem(id);
  };

  const handleDragEnd = async (targetId: string) => {
    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null);
      return;
    }

    const draggedIndex = slides.findIndex(s => s.id === draggedItem);
    const targetIndex = slides.findIndex(s => s.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    // Reorder locally first
    const newSlides = [...slides];
    const [removed] = newSlides.splice(draggedIndex, 1);
    newSlides.splice(targetIndex, 0, removed);

    // Update display_order
    const updates = newSlides.map((slide, index) => ({
      ...slide,
      display_order: index,
    }));

    setSlides(updates);
    setDraggedItem(null);

    // Update in database
    for (const slide of updates) {
      await supabase
        .from('idle_slideshow')
        .update({ display_order: slide.display_order })
        .eq('id', slide.id);
    }
  };

  // Toggle slide active status
  const toggleActive = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('idle_slideshow')
      .update({ is_active: !currentValue })
      .eq('id', id);

    if (!error) {
      setSlides(prev => 
        prev.map(s => s.id === id ? { ...s, is_active: !currentValue } : s)
      );
    }
  };

  // Update slide title
  const updateTitle = async (id: string, title: string) => {
    await supabase
      .from('idle_slideshow')
      .update({ title })
      .eq('id', id);

    setSlides(prev => 
      prev.map(s => s.id === id ? { ...s, title } : s)
    );
  };

  // Update slide duration
  const updateDuration = async (id: string, duration: number) => {
    await supabase
      .from('idle_slideshow')
      .update({ duration_seconds: duration })
      .eq('id', id);

    setSlides(prev => 
      prev.map(s => s.id === id ? { ...s, duration_seconds: duration } : s)
    );
  };

  // Delete slide
  const deleteSlide = async (id: string, mediaUrl: string) => {
    // Delete from database
    const { error } = await supabase
      .from('idle_slideshow')
      .delete()
      .eq('id', id);

    if (!error) {
      // Try to delete from storage
      const fileName = mediaUrl.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('slideshow-media')
          .remove([fileName]);
      }

      setSlides(prev => prev.filter(s => s.id !== id));
      toast.success('Slide deleted');
    } else {
      toast.error('Failed to delete slide');
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Idle Screen Slideshow</h1>
            <p className="text-muted-foreground">Manage promotional content for the idle screen</p>
          </div>
          <div className="ml-auto">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
          </div>
        </div>

        {/* Upload Area */}
        <Card 
          className={`mb-6 border-2 border-dashed transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="p-8">
            <div className="text-center">
              {isUploading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <p className="text-muted-foreground">Uploading...</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Video className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <p className="text-lg font-medium text-foreground mb-2">
                    Drag and drop images or videos here
                  </p>
                  <p className="text-muted-foreground mb-4">
                    or click to select files
                  </p>
                  <label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                    <Button asChild variant="outline" className="gap-2">
                      <span>
                        <Plus className="w-4 h-4" />
                        Add Files
                      </span>
                    </Button>
                  </label>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Slides List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Slides ({slides.length})
          </h2>
          
          {slides.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No slides yet. Upload images or videos to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {slides.map((slide) => (
                <Card 
                  key={slide.id}
                  className={`transition-all ${
                    draggedItem === slide.id ? 'opacity-50 scale-95' : ''
                  } ${!slide.is_active ? 'opacity-60' : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(slide.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDragEnd(slide.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Drag Handle */}
                      <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="w-5 h-5" />
                      </div>

                      {/* Thumbnail */}
                      <div className="w-24 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
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

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          {slide.media_type === 'video' ? (
                            <Video className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          )}
                          <Input
                            value={slide.title || ''}
                            onChange={(e) => updateTitle(slide.id, e.target.value)}
                            placeholder="Slide title"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Duration (sec)</Label>
                            <Input
                              type="number"
                              value={slide.duration_seconds}
                              onChange={(e) => updateDuration(slide.id, parseInt(e.target.value) || 5)}
                              min={1}
                              max={120}
                              className="w-16 h-7 text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Active</Label>
                          <Switch
                            checked={slide.is_active}
                            onCheckedChange={() => toggleActive(slide.id, slide.is_active)}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteSlide(slide.id, slide.media_url)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
