import { FileItem } from '@/hooks/useFiles';
import { Folder, FileText, Image, Film, Music, FileArchive, MoreVertical, Star, Share2, Pencil, Trash2, Download, RotateCcw, Eye, Link } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface FileGridProps {
  files: FileItem[];
  viewMode: 'grid' | 'list';
  onOpenFolder: (file: FileItem) => void;
  onRename: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onToggleStar: (file: FileItem) => void;
  onToggleShare: (file: FileItem) => void;
  onPreview: (file: FileItem) => void;
  onRestore?: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onCopyLink?: (file: FileItem) => void;
  isTrash?: boolean;
}

function getFileIcon(file: FileItem) {
  if (file.type === 'folder') return <Folder className="h-10 w-10 text-primary" fill="currentColor" fillOpacity={0.15} />;
  const mime = file.mime_type || '';
  if (mime.startsWith('image/')) return <Image className="h-10 w-10 text-emerald-500" />;
  if (mime.startsWith('video/')) return <Film className="h-10 w-10 text-rose-500" />;
  if (mime.startsWith('audio/')) return <Music className="h-10 w-10 text-violet-500" />;
  if (mime.includes('zip') || mime.includes('archive') || mime.includes('rar')) return <FileArchive className="h-10 w-10 text-amber-500" />;
  return <FileText className="h-10 w-10 text-muted-foreground" />;
}

function formatSize(bytes: number) {
  if (!bytes) return '--';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function FileGrid({ files, viewMode, onOpenFolder, onRename, onDelete, onToggleStar, onToggleShare, onPreview, onRestore, onDownload, onCopyLink, isTrash }: FileGridProps) {
  if (!files.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Folder className="h-16 w-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">No files here</p>
        <p className="text-sm mt-1">Upload files or create folders to get started</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-secondary/50 text-xs font-medium text-muted-foreground">
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">Modified</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Size</th>
              <th className="w-10 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {files.map(file => (
              <tr
                key={file.id}
                className="border-t border-border hover:bg-surface-hover transition-colors cursor-pointer group"
                onDoubleClick={() => file.type === 'folder' ? onOpenFolder(file) : onPreview(file)}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 [&>svg]:h-5 [&>svg]:w-5">{getFileIcon(file)}</div>
                    <span className="text-sm font-medium text-foreground truncate">{file.name}</span>
                    {file.is_starred && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                    {file.shared && <Share2 className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground hidden sm:table-cell">{formatDate(file.updated_at)}</td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground hidden md:table-cell">{file.type === 'folder' ? '--' : formatSize(file.size)}</td>
                <td className="px-2 py-2.5">
                  <FileActions file={file} isTrash={isTrash} onRename={onRename} onDelete={onDelete} onToggleStar={onToggleStar} onToggleShare={onToggleShare} onPreview={onPreview} onRestore={onRestore} onDownload={onDownload} onCopyLink={onCopyLink} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {files.map(file => (
        <div
          key={file.id}
          className="group relative flex flex-col items-center rounded-xl border border-border bg-card p-4 hover:bg-surface-hover hover:border-primary/30 transition-all cursor-pointer animate-fade-in"
          onDoubleClick={() => file.type === 'folder' ? onOpenFolder(file) : onPreview(file)}
        >
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <FileActions file={file} isTrash={isTrash} onRename={onRename} onDelete={onDelete} onToggleStar={onToggleStar} onToggleShare={onToggleShare} onPreview={onPreview} onRestore={onRestore} onDownload={onDownload} onCopyLink={onCopyLink} />
          </div>
          {file.is_starred && <Star className="absolute top-2 left-2 h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
          <div className="mb-3 mt-1">{getFileIcon(file)}</div>
          <p className="text-xs font-medium text-foreground text-center truncate w-full">{file.name}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{file.type === 'folder' ? 'Folder' : formatSize(file.size)}</p>
        </div>
      ))}
    </div>
  );
}

function FileActions({ file, isTrash, onRename, onDelete, onToggleStar, onToggleShare, onPreview, onRestore, onDownload, onCopyLink }: {
  file: FileItem;
  isTrash?: boolean;
  onRename: (f: FileItem) => void;
  onDelete: (f: FileItem) => void;
  onToggleStar: (f: FileItem) => void;
  onToggleShare: (f: FileItem) => void;
  onPreview: (f: FileItem) => void;
  onRestore?: (f: FileItem) => void;
  onDownload: (f: FileItem) => void;
  onCopyLink?: (f: FileItem) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1 rounded-lg hover:bg-secondary transition-colors" onClick={e => e.stopPropagation()}>
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {isTrash ? (
          <>
            {onRestore && <DropdownMenuItem onClick={() => onRestore(file)}><RotateCcw className="h-4 w-4 mr-2" />Restore</DropdownMenuItem>}
            <DropdownMenuItem onClick={() => onDelete(file)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete permanently</DropdownMenuItem>
          </>
        ) : (
          <>
            {file.type === 'file' && <DropdownMenuItem onClick={() => onPreview(file)}><Eye className="h-4 w-4 mr-2" />Preview</DropdownMenuItem>}
            {file.type === 'file' && <DropdownMenuItem onClick={() => onDownload(file)}><Download className="h-4 w-4 mr-2" />Download</DropdownMenuItem>}
            {file.type === 'file' && file.bunny_cdn_url && onCopyLink && (
              <DropdownMenuItem onClick={() => onCopyLink(file)}><Link className="h-4 w-4 mr-2" />Copy link</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onRename(file)}><Pencil className="h-4 w-4 mr-2" />Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleStar(file)}><Star className={cn("h-4 w-4 mr-2", file.is_starred && "fill-amber-400 text-amber-400")} />{file.is_starred ? 'Unstar' : 'Star'}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleShare(file)}><Share2 className="h-4 w-4 mr-2" />{file.shared ? 'Stop sharing' : 'Share'}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(file)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Move to trash</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
