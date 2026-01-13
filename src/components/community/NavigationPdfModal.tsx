import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Printer, ChevronLeft, ChevronRight, Loader2, FileText, ZoomIn, ZoomOut } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

interface NavigationPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  programmeTitle: string;
}

export function NavigationPdfModal({ isOpen, onClose, pdfUrl, programmeTitle }: NavigationPdfModalProps) {
  const { t } = useApp();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePrint = () => {
    setIsPrinting(true);
    
    // Open PDF in new window for printing
    const printWindow = window.open(pdfUrl, '_blank');
    
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    // Simulate printing completion
    setTimeout(() => {
      setIsPrinting(false);
      toast.success(t('community.printSuccess'));
    }, 2000);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/50">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            <div>
              <DialogTitle className="text-xl font-bold">
                {t('community.navigationCard')}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">{programmeTitle}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-background">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={scale >= 2}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="default"
            size="lg"
            onClick={handlePrint}
            disabled={isPrinting || isLoading}
            className="h-12 px-6 text-lg"
          >
            {isPrinting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {t('community.printing')}
              </>
            ) : (
              <>
                <Printer className="w-5 h-5 mr-2" />
                {t('community.printNavigationCard')}
              </>
            )}
          </Button>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto bg-muted/30 p-4">
          <div 
            className="bg-white rounded-lg shadow-lg mx-auto overflow-hidden"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease',
              maxWidth: '100%',
            }}
          >
            {isLoading && (
              <div className="flex items-center justify-center h-[600px] bg-muted/20">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-muted-foreground">{t('community.loadingNavCard')}</p>
                </div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
              className="w-full min-h-[600px]"
              style={{ 
                display: isLoading ? 'none' : 'block',
                height: '70vh',
              }}
              onLoad={handleIframeLoad}
              title="Navigation PDF"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/50 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('community.navCardHint')}
          </p>
          <Button variant="outline" onClick={onClose}>
            {t('community.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}