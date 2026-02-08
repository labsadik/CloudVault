import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface FileItem {
  id: string;
  user_id: string;
  name: string;
  type: 'file' | 'folder';
  mime_type: string | null;
  size: number;
  parent_id: string | null;
  storage_path: string | null;
  is_starred: boolean;
  is_trashed: boolean;
  shared: boolean;
  created_at: string;
  updated_at: string;
  bunny_cdn_url?: string | null;
  bunny_video_id?: string | null;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'done' | 'error';
  error?: string;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  videoCount: number;
  imageCount: number;
  folderCount: number;
}

export function useFiles() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats>({
    totalFiles: 0, totalSize: 0, videoCount: 0, imageCount: 0, folderCount: 0,
  });

  const fetchStorageStats = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('files')
      .select('size, type, mime_type')
      .eq('user_id', user.id)
      .eq('is_trashed', false);
    if (error || !data) return;

    let totalSize = 0, videoCount = 0, imageCount = 0, folderCount = 0, totalFiles = 0;
    data.forEach(f => {
      if (f.type === 'folder') { folderCount++; return; }
      totalFiles++;
      totalSize += f.size || 0;
      const mime = f.mime_type || '';
      if (mime.startsWith('video/')) videoCount++;
      if (mime.startsWith('image/')) imageCount++;
    });
    setStorageStats({ totalFiles, totalSize, videoCount, imageCount, folderCount });
  }, [user]);

  const fetchFiles = useCallback(async (parentId: string | null = null, filter?: string) => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      if (filter === 'starred') {
        query = query.eq('is_starred', true).eq('is_trashed', false);
      } else if (filter === 'trash') {
        query = query.eq('is_trashed', true);
      } else if (filter === 'shared') {
        query = query.eq('shared', true).eq('is_trashed', false);
      } else if (filter === 'recent') {
        query = query.eq('is_trashed', false).order('updated_at', { ascending: false }).limit(50);
      } else {
        if (parentId) {
          query = query.eq('parent_id', parentId);
        } else {
          query = query.is('parent_id', null);
        }
        query = query.eq('is_trashed', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFiles((data as FileItem[]) || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
    // Also refresh stats
    fetchStorageStats();
  }, [user, toast, fetchStorageStats]);

  const createFolder = useCallback(async (name: string, parentId: string | null) => {
    if (!user) return;
    const { error } = await supabase.from('files').insert({
      user_id: user.id, name, type: 'folder', parent_id: parentId,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Folder created' });
  }, [user, toast]);

  const updateUploadProgress = (fileName: string, updates: Partial<UploadProgress>) => {
    setUploads(prev => prev.map(u => u.fileName === fileName ? { ...u, ...updates } : u));
  };

  const removeUpload = (fileName: string) => {
    setTimeout(() => {
      setUploads(prev => prev.filter(u => u.fileName !== fileName));
    }, 2000);
  };

  const uploadToBunnyStorage = useCallback(async (file: File, userId: string): Promise<{ url: string; path: string }> => {
    const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      xhr.open('POST', `${supabaseUrl}/functions/v1/bunny-storage?action=upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.setRequestHeader('apikey', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          updateUploadProgress(file.name, { progress: pct });
        }
      };

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && res.success) {
            resolve({ url: res.url, path: res.path });
          } else {
            reject(new Error(res.error || 'Upload failed'));
          }
        } catch {
          reject(new Error('Invalid response'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(formData);
    });
  }, []);

  const uploadToBunnyStream = useCallback(async (file: File, userId: string): Promise<{ videoId: string; embedUrl: string }> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    };

    // Step 1: Create video placeholder and get direct upload credentials
    updateUploadProgress(file.name, { status: 'processing', progress: 5 });
    const createRes = await fetch(`${supabaseUrl}/functions/v1/bunny-stream?action=create-video`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: file.name }),
    });
    const createData = await createRes.json();
    if (!createData.success) throw new Error(createData.error || 'Failed to create video');

    // Step 2: Upload directly to Bunny Stream API using the credentials returned
    const { videoId, libraryId, apiKey } = createData;
    const directUploadUrl = `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', directUploadUrl);
      xhr.setRequestHeader('AccessKey', apiKey);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round(5 + (e.loaded / e.total) * 95);
          updateUploadProgress(file.name, { progress: pct });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
          resolve({ videoId, embedUrl });
        } else {
          reject(new Error(`Video upload failed [${xhr.status}]: ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during video upload'));
      xhr.send(file);
    });
  }, []);

  const uploadFiles = useCallback(async (fileList: File[], parentId: string | null) => {
    if (!user) return;

    const newUploads: UploadProgress[] = fileList.map(f => ({
      fileName: f.name, progress: 0, status: 'uploading',
    }));
    setUploads(prev => [...prev, ...newUploads]);

    for (const file of fileList) {
      try {
        const isVideo = file.type.startsWith('video/');

        if (isVideo) {
          const { videoId, embedUrl } = await uploadToBunnyStream(file, user.id);
          // Also upload to bunny storage for download purposes
          let cdnUrl = embedUrl;
          let storagePath = `bunny-stream://${videoId}`;
          
          // Additionally store in bunny storage for direct download
          try {
            const storageResult = await uploadToBunnyStorage(file, user.id);
            cdnUrl = storageResult.url;
            storagePath = `bunny-stream://${videoId}`;
          } catch {
            // Storage upload optional for videos
          }

          await supabase.from('files').insert({
            user_id: user.id, name: file.name, type: 'file',
            mime_type: file.type, size: file.size, parent_id: parentId,
            storage_path: storagePath,
            bunny_video_id: videoId,
            bunny_cdn_url: cdnUrl,
          });
        } else {
          const { url, path } = await uploadToBunnyStorage(file, user.id);
          await supabase.from('files').insert({
            user_id: user.id, name: file.name, type: 'file',
            mime_type: file.type, size: file.size, parent_id: parentId,
            storage_path: `bunny-storage://${path}`,
            bunny_cdn_url: url,
          });
        }

        updateUploadProgress(file.name, { progress: 100, status: 'done' });
        removeUpload(file.name);
      } catch (error: any) {
        console.error(`Upload failed for ${file.name}:`, error);
        updateUploadProgress(file.name, { status: 'error', error: error.message });
        toast({ title: `Upload failed: ${file.name}`, description: error.message, variant: 'destructive' });
        removeUpload(file.name);
      }
    }

    toast({ title: 'Upload complete' });
  }, [user, toast, uploadToBunnyStorage, uploadToBunnyStream]);

  const renameFile = useCallback(async (fileId: string, newName: string) => {
    const { error } = await supabase.from('files').update({ name: newName }).eq('id', fileId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Renamed successfully' });
  }, [toast]);

  const deleteFile = useCallback(async (file: FileItem) => {
    if (file.is_trashed) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && file.storage_path) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const headers = {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          };

          if (file.storage_path.startsWith('bunny-stream://')) {
            const videoId = file.storage_path.replace('bunny-stream://', '');
            await fetch(`${supabaseUrl}/functions/v1/bunny-stream?action=delete-video`, {
              method: 'POST', headers, body: JSON.stringify({ videoId }),
            });
          } else if (file.storage_path.startsWith('bunny-storage://')) {
            const path = file.storage_path.replace('bunny-storage://', '');
            await fetch(`${supabaseUrl}/functions/v1/bunny-storage?action=delete`, {
              method: 'POST', headers, body: JSON.stringify({ path }),
            });
          }
        }
      } catch (e) {
        console.error('Failed to delete from Bunny:', e);
      }

      const { error } = await supabase.from('files').delete().eq('id', file.id);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Permanently deleted' });
    } else {
      const { error } = await supabase.from('files').update({ is_trashed: true }).eq('id', file.id);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Moved to trash' });
    }
  }, [toast]);

  const restoreFile = useCallback(async (fileId: string) => {
    const { error } = await supabase.from('files').update({ is_trashed: false }).eq('id', fileId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Restored' });
  }, [toast]);

  const toggleStar = useCallback(async (file: FileItem) => {
    const { error } = await supabase.from('files').update({ is_starred: !file.is_starred }).eq('id', file.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
  }, [toast]);

  const toggleShare = useCallback(async (file: FileItem) => {
    const newShared = !file.shared;
    const { error } = await supabase.from('files').update({ shared: newShared }).eq('id', file.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    }
    
    if (newShared && file.bunny_cdn_url) {
      // Copy public link to clipboard
      await navigator.clipboard.writeText(file.bunny_cdn_url);
      toast({ title: 'Public link copied!', description: 'Link has been copied to your clipboard.' });
      return file.bunny_cdn_url;
    } else if (newShared) {
      toast({ title: 'Sharing enabled' });
    } else {
      toast({ title: 'Sharing disabled' });
    }
    return null;
  }, [toast]);

  const copyShareLink = useCallback(async (file: FileItem) => {
    if (!file.bunny_cdn_url) {
      toast({ title: 'No link available', variant: 'destructive' });
      return;
    }
    // For videos, provide the embed URL
    let shareUrl = file.bunny_cdn_url;
    if (file.bunny_video_id) {
      // Use the direct play URL for sharing
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/bunny-stream?action=get-video&videoId=${file.bunny_video_id}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          });
          const data = await res.json();
          if (data.embedUrl) shareUrl = data.embedUrl;
        } catch {
          // Use the stored URL as fallback
        }
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: 'Link copied!', description: shareUrl });
  }, [toast]);

  const getFileUrl = useCallback((file: FileItem): string | null => {
    if (file.bunny_cdn_url) return file.bunny_cdn_url;
    if (file.storage_path && !file.storage_path.startsWith('bunny-')) {
      const { data } = supabase.storage.from('user-files').getPublicUrl(file.storage_path);
      return data.publicUrl;
    }
    return null;
  }, []);

  const getVideoEmbedUrl = useCallback((file: FileItem): string | null => {
    if (file.bunny_video_id) {
      // Construct embed URL from video ID
      return `https://iframe.mediadelivery.net/embed/${file.bunny_video_id}?autoplay=false&preload=true`;
    }
    return null;
  }, []);

  const emptyTrash = useCallback(async () => {
    if (!user) return;
    const { data: trashedFiles } = await supabase
      .from('files').select('*')
      .eq('user_id', user.id).eq('is_trashed', true);

    if (trashedFiles) {
      for (const file of trashedFiles) {
        if (file.storage_path) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              const headers = {
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                'Content-Type': 'application/json',
              };
              if (file.storage_path.startsWith('bunny-stream://')) {
                const videoId = file.storage_path.replace('bunny-stream://', '');
                await fetch(`${supabaseUrl}/functions/v1/bunny-stream?action=delete-video`, {
                  method: 'POST', headers, body: JSON.stringify({ videoId }),
                });
              } else if (file.storage_path.startsWith('bunny-storage://')) {
                const path = file.storage_path.replace('bunny-storage://', '');
                await fetch(`${supabaseUrl}/functions/v1/bunny-storage?action=delete`, {
                  method: 'POST', headers, body: JSON.stringify({ path }),
                });
              }
            }
          } catch (e) {
            console.error('Failed to delete from Bunny:', e);
          }
        }
      }
      await supabase.from('files').delete().eq('user_id', user.id).eq('is_trashed', true);
      toast({ title: 'Trash emptied' });
    }
  }, [user, toast]);

  return {
    files, loading, uploads, storageStats, fetchFiles, fetchStorageStats, createFolder, uploadFiles,
    renameFile, deleteFile, restoreFile, toggleStar, toggleShare, copyShareLink,
    getFileUrl, getVideoEmbedUrl, emptyTrash,
  };
}
