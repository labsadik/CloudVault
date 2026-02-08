import { UploadProgress } from '@/hooks/useFiles';
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface UploadProgressBarProps {
  uploads: UploadProgress[];
}

export default function UploadProgressBar({ uploads }: UploadProgressBarProps) {
  if (!uploads.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-h-72 overflow-y-auto rounded-xl border border-border bg-card shadow-lg animate-fade-in">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          Uploading {uploads.filter(u => u.status === 'uploading' || u.status === 'processing').length} file(s)
        </h3>
      </div>
      <div className="divide-y divide-border">
        {uploads.map(upload => (
          <div key={upload.fileName} className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              {upload.status === 'done' && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
              {upload.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
              {(upload.status === 'uploading' || upload.status === 'processing') && (
                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
              )}
              <span className="text-xs font-medium text-foreground truncate flex-1">{upload.fileName}</span>
              <span className="text-xs text-muted-foreground shrink-0">{upload.progress}%</span>
            </div>
            <Progress value={upload.progress} className="h-1.5" />
            {upload.error && <p className="text-xs text-destructive">{upload.error}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
