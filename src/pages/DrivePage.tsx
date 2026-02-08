import { useState, useEffect, useCallback, useRef } from 'react';
import { useFiles, FileItem } from '@/hooks/useFiles';
import DriveSidebar from '@/components/drive/DriveSidebar';
import FileGrid from '@/components/drive/FileGrid';
import FilePreview from '@/components/drive/FilePreview';
import RenameDialog from '@/components/drive/RenameDialog';
import NewFolderDialog from '@/components/drive/NewFolderDialog';
import UploadProgressBar from '@/components/drive/UploadProgressBar';
import { Button } from '@/components/ui/button';
import { Menu, LayoutGrid, List, Search, ChevronRight, Trash2, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export default function DrivePage() {
  const {
    files, loading, uploads, storageStats, fetchFiles, createFolder, uploadFiles,
    renameFile, deleteFile, restoreFile, toggleStar, toggleShare, copyShareLink,
    getFileUrl, emptyTrash,
  } = useFiles();

  const [activeView, setActiveView] = useState('my-drive');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: 'My Drive' }]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeView === 'my-drive') {
      fetchFiles(currentFolderId);
    } else {
      fetchFiles(null, activeView === 'starred' ? 'starred' :
        activeView === 'trash' ? 'trash' :
        activeView === 'shared' ? 'shared' :
        activeView === 'recent' ? 'recent' : undefined);
    }
  }, [activeView, currentFolderId, fetchFiles]);

  const handleViewChange = (view: string) => {
    setActiveView(view);
    if (view !== 'my-drive') {
      setCurrentFolderId(null);
      setBreadcrumbs([{ id: null, name: 'My Drive' }]);
    }
  };

  const handleOpenFolder = useCallback(async (file: FileItem) => {
    if (file.type !== 'folder') return;
    setActiveView('my-drive');
    setCurrentFolderId(file.id);
    setBreadcrumbs(prev => [...prev, { id: file.id, name: file.name }]);
  }, []);

  const handleBreadcrumbClick = (index: number) => {
    const item = breadcrumbs[index];
    setCurrentFolderId(item.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    setActiveView('my-drive');
  };

  const handleUpload = () => fileInputRef.current?.click();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles?.length) return;
    await uploadFiles(Array.from(selectedFiles), currentFolderId);
    if (activeView === 'my-drive') fetchFiles(currentFolderId);
    else fetchFiles(null, activeView);
    e.target.value = '';
  };

  const handleCreateFolder = async (name: string) => {
    await createFolder(name, currentFolderId);
    fetchFiles(currentFolderId);
  };

  const handleRename = async (id: string, name: string) => {
    await renameFile(id, name);
    if (activeView === 'my-drive') fetchFiles(currentFolderId);
    else fetchFiles(null, activeView);
  };

  const handleDelete = async (file: FileItem) => {
    await deleteFile(file);
    if (activeView === 'my-drive') fetchFiles(currentFolderId);
    else fetchFiles(null, activeView);
  };

  const handleRestore = async (file: FileItem) => {
    await restoreFile(file.id);
    fetchFiles(null, 'trash');
  };

  const handleToggleStar = async (file: FileItem) => {
    await toggleStar(file);
    if (activeView === 'my-drive') fetchFiles(currentFolderId);
    else fetchFiles(null, activeView);
  };

  const handleToggleShare = async (file: FileItem) => {
    await toggleShare(file);
    if (activeView === 'my-drive') fetchFiles(currentFolderId);
    else fetchFiles(null, activeView);
  };

  const handlePreview = (file: FileItem) => {
    const url = getFileUrl(file);
    if (url) {
      setPreviewUrl(url);
      setPreviewFile(file);
    }
  };

  const handleDownload = (file: FileItem) => {
    const url = getFileUrl(file);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleEmptyTrash = async () => {
    await emptyTrash();
    fetchFiles(null, 'trash');
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length) {
      await uploadFiles(droppedFiles, currentFolderId);
      fetchFiles(currentFolderId);
    }
  }, [uploadFiles, currentFolderId, fetchFiles]);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const filteredFiles = searchQuery
    ? files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  const viewTitle = activeView === 'my-drive' ? 'My Drive' :
    activeView === 'recent' ? 'Recent' :
    activeView === 'starred' ? 'Starred' :
    activeView === 'shared' ? 'Shared' :
    activeView === 'trash' ? 'Trash' : 'My Drive';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DriveSidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        onNewFolder={() => setNewFolderOpen(true)}
        onUpload={handleUpload}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        storageStats={storageStats}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden" onDrop={handleDrop} onDragOver={handleDragOver}>
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
          <button className="lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search files..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-secondary border-0 focus-visible:ring-1" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <div className="flex items-center gap-1 text-sm">
            {activeView === 'my-drive' ? (
              breadcrumbs.map((crumb, i) => (
                <div key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  <button onClick={() => handleBreadcrumbClick(i)} className={`px-2 py-1 rounded-md transition-colors ${i === breadcrumbs.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                    {crumb.name}
                  </button>
                </div>
              ))
            ) : (
              <span className="px-2 py-1 font-medium text-foreground">{viewTitle}</span>
            )}
          </div>
          {activeView === 'trash' && files.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleEmptyTrash} className="text-destructive border-destructive/30 hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />Empty Trash
            </Button>
          )}
          {activeView === 'my-drive' && (
            <Button variant="outline" size="sm" onClick={handleUpload} className="sm:hidden">
              <Upload className="h-3.5 w-3.5 mr-1.5" />Upload
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <FileGrid
              files={filteredFiles}
              viewMode={viewMode}
              onOpenFolder={handleOpenFolder}
              onRename={setRenameTarget}
              onDelete={handleDelete}
              onToggleStar={handleToggleStar}
              onToggleShare={handleToggleShare}
              onPreview={handlePreview}
              onRestore={activeView === 'trash' ? handleRestore : undefined}
              onDownload={handleDownload}
              onCopyLink={copyShareLink}
              isTrash={activeView === 'trash'}
            />
          )}
        </div>
      </main>

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />

      <NewFolderDialog open={newFolderOpen} onClose={() => setNewFolderOpen(false)} onCreate={handleCreateFolder} />
      <RenameDialog file={renameTarget} onClose={() => setRenameTarget(null)} onRename={handleRename} />
      <FilePreview
        file={previewFile}
        url={previewUrl}
        onClose={() => { setPreviewFile(null); setPreviewUrl(null); }}
        onDownload={() => previewFile && handleDownload(previewFile)}
      />

      <UploadProgressBar uploads={uploads} />
    </div>
  );
}
