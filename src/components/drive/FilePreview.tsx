import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileItem } from '@/hooks/useFiles';
import { Download, Link, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FilePreviewProps {
  file: FileItem | null;
  url: string | null;
  onClose: () => void;
  onDownload: () => void;
}

export default function FilePreview({ file, url, onClose, onDownload }: FilePreviewProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loadingEmbed, setLoadingEmbed] = useState(false);

  useEffect(() => {
    if (!file?.bunny_video_id) {
      setEmbedUrl(null);
      return;
    }
    
    // Fetch the embed URL with the correct library ID from the edge function
    const fetchEmbed = async () => {
      setLoadingEmbed(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/bunny-stream?action=get-video&videoId=${file.bunny_video_id}`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );
        const data = await res.json();
        if (data.embedUrl) {
          setEmbedUrl(data.embedUrl + '?autoplay=false&preload=true&responsive=true');
        }
      } catch (e) {
        console.error('Failed to fetch embed URL:', e);
      } finally {
        setLoadingEmbed(false);
      }
    };
    fetchEmbed();
  }, [file?.bunny_video_id]);

  if (!file || !url) return null;

  const mime = file.mime_type || '';
  const isImage = mime.startsWith('image/');
  const isVideo = mime.startsWith('video/');
  const isAudio = mime.startsWith('audio/');
  const isPdf = mime === 'application/pdf';
  const isBunnyStream = !!file.bunny_video_id;

  const handleCopyLink = async () => {
    const link = file.bunny_cdn_url || url;
    if (link) {
      await navigator.clipboard.writeText(link);
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-border">
          <DialogTitle className="text-sm font-medium truncate pr-4">{file.name}</DialogTitle>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={handleCopyLink} title="Copy link">
              <Copy className="h-4 w-4" />
            </Button>
            {!isBunnyStream && (
              <Button variant="ghost" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="flex items-center justify-center min-h-[300px] max-h-[calc(90vh-60px)] overflow-auto bg-secondary/30 p-4">
          {isBunnyStream ? (
            loadingEmbed ? (
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading video...</p>
              </div>
            ) : embedUrl ? (
              <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
                <iframe
                  src={embedUrl}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  title={file.name}
                  loading="lazy"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-10">
                <p className="text-lg font-medium mb-2">Video is processing</p>
                <p className="text-sm">The video is being transcoded. Please try again in a few minutes.</p>
              </div>
            )
          ) : isImage ? (
            <img src={url} alt={file.name} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
          ) : isVideo ? (
            <video src={url} controls className="max-w-full max-h-[70vh] rounded-lg" autoPlay>
              Your browser does not support video playback.
            </video>
          ) : isAudio ? (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="text-6xl">🎵</div>
              <p className="text-sm text-muted-foreground">{file.name}</p>
              <audio src={url} controls className="w-full max-w-md" />
            </div>
          ) : isPdf ? (
            <iframe src={url} className="w-full h-[70vh] rounded-lg" title={file.name} />
          ) : (
            <div className="text-center text-muted-foreground py-10">
              <p className="text-lg font-medium mb-2">Preview not available</p>
              <p className="text-sm">Download the file to view it</p>
              <Button onClick={onDownload} className="mt-4">
                <Download className="h-4 w-4 mr-2" />Download
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
