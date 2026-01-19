import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Printer, Loader2, FileText, ExternalLink } from 'lucide-react';
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
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPdfLoaded(false);
      setPdfError(false);
    }
  }, [isOpen, pdfUrl]);

  const handlePrint = () => {
    setIsPrinting(true);
    window.open(pdfUrl, '_blank');
    setTimeout(() => {
      setIsPrinting(false);
      toast.success(t('community.printSuccess'));
    }, 2000);
  };

  const handleOpenInNewTab = () => {
    window.open(pdfUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 [&>button]:hidden">
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
        <div className="flex items-center justify-end px-6 py-3 border-b bg-background">
          <Button
            variant="default"
            size="lg"
            onClick={handlePrint}
            disabled={isPrinting}
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

        {/* PDF Viewer - Direct embed, no Google Docs */}
        <div className="flex-1 overflow-hidden bg-muted/30 relative">
          {!pdfLoaded && !pdfError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground">{t('community.loadingNavCard')}</p>
              </div>
            </div>
          )}
          
          {pdfError ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              <FileText className="w-16 h-16 text-muted-foreground" />
              <p className="text-lg text-muted-foreground text-center px-4">
                {t('community.pdfLoadError') || 'Unable to display PDF in browser'}
              </p>
              <Button
                variant="default"
                size="lg"
                onClick={handleOpenInNewTab}
                className="h-12 px-6"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                {t('community.openInNewTab') || 'Open PDF in New Tab'}
              </Button>
            </div>
          ) : (
            <iframe
              src={pdfUrl}
              className={`w-full h-full border-0 ${pdfLoaded ? 'opacity-100' : 'opacity-0'}`}
              title="Navigation PDF"
              onLoad={() => setPdfLoaded(true)}
              onError={() => setPdfError(true)}
            />
          )}
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
