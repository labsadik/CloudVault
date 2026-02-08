import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileItem } from '@/hooks/useFiles';

interface RenameDialogProps {
  file: FileItem | null;
  onClose: () => void;
  onRename: (id: string, name: string) => void;
}

export default function RenameDialog({ file, onClose, onRename }: RenameDialogProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (file) setName(file.name);
  }, [file]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file && name.trim()) {
      onRename(file.id, name.trim());
      onClose();
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Input value={name} onChange={e => setName(e.target.value)} autoFocus className="mb-4" />
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!name.trim()}>Rename</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
