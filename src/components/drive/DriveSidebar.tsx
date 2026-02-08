import { HardDrive, Clock, Star, Share2, Trash2, Plus, LogOut, Film, Image, FolderOpen, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { StorageStats } from '@/hooks/useFiles';
import { Progress } from '@/components/ui/progress';

interface DriveSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onNewFolder: () => void;
  onUpload: () => void;
  isOpen: boolean;
  onClose: () => void;
  storageStats: StorageStats;
}

const navItems = [
  { id: 'my-drive', label: 'My Drive', icon: HardDrive },
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'shared', label: 'Shared', icon: Share2 },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

function formatSize(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export default function DriveSidebar({ activeView, onViewChange, onNewFolder, onUpload, isOpen, onClose, storageStats = { totalFiles: 0, totalSize: 0, videoCount: 0, imageCount: 0, folderCount: 0 } }: DriveSidebarProps) {
  const { signOut, user } = useAuth();

  // Assume 10GB max for progress bar visual
  const maxStorage = 10 * 1024 * 1024 * 1024;
  const usagePercent = Math.min((storageStats.totalSize / maxStorage) * 100, 100);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-border bg-card transition-transform duration-200 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <HardDrive className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-display font-semibold text-foreground">CloudVault</span>
        </div>

        {/* New button */}
        <div className="px-3 py-3 space-y-1">
          <Button onClick={onUpload} className="w-full justify-start gap-2 rounded-xl shadow-sm">
            <Plus className="h-4 w-4" />Upload
          </Button>
          <Button variant="outline" onClick={onNewFolder} className="w-full justify-start gap-2 rounded-xl">
            <Plus className="h-4 w-4" />New Folder
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { onViewChange(item.id); onClose(); }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                activeView === item.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Storage Stats */}
        <div className="border-t border-border px-4 py-3 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-foreground">Storage</span>
              <span className="text-[10px] text-muted-foreground">{formatSize(storageStats.totalSize)} / 1 TB</span>
            </div>
            <Progress value={usagePercent} className="h-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span>{storageStats.totalFiles} files</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FolderOpen className="h-3.5 w-3.5 shrink-0" />
              <span>{storageStats.folderCount} folders</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Film className="h-3.5 w-3.5 shrink-0" />
              <span>{storageStats.videoCount} videos</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Image className="h-3.5 w-3.5 shrink-0" />
              <span>{storageStats.imageCount} images</span>
            </div>
          </div>
        </div>

        {/* User */}
        <div className="border-t border-border px-3 py-3">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user?.email}</p>
            </div>
            <button onClick={signOut} className="text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
