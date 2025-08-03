import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Plus, MoreVertical, Edit, Trash2, Copy, Star, StarOff, 
  Folder, FolderOpen, Users, Globe
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Watchlist {
  id: string;
  name: string;
  description?: string;
  symbols: any[];
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

interface WatchlistManagerProps {
  onWatchlistChange?: (watchlist: Watchlist) => void;
}

export default function WatchlistManager({ onWatchlistChange }: WatchlistManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingWatchlist, setEditingWatchlist] = useState<Watchlist | null>(null);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [newWatchlistDescription, setNewWatchlistDescription] = useState('');
  const queryClient = useQueryClient();

  // Fetch all watchlists
  const { data: watchlists = [], isLoading } = useQuery<Watchlist[]>({
    queryKey: ['/api/watchlist/watchlists'],
    refetchInterval: 30000
  });

  // Fetch current active watchlist
  const { data: currentWatchlist } = useQuery<Watchlist>({
    queryKey: ['/api/watchlist/watchlists/current'],
    refetchInterval: 10000
  });

  // Create watchlist mutation
  const createWatchlistMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await apiRequest('POST', '/api/watchlist/watchlists', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist/watchlists'] });
      setShowCreateDialog(false);
      setNewWatchlistName('');
      setNewWatchlistDescription('');
    }
  });

  // Update watchlist mutation
  const updateWatchlistMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; description?: string } }) => {
      const response = await apiRequest('PUT', `/api/watchlist/watchlists/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist/watchlists'] });
      setShowEditDialog(false);
      setEditingWatchlist(null);
    }
  });

  // Delete watchlist mutation
  const deleteWatchlistMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/watchlist/watchlists/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist/watchlists'] });
    }
  });

  // Duplicate watchlist mutation
  const duplicateWatchlistMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await apiRequest('POST', `/api/watchlist/watchlists/${id}/duplicate`, { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist/watchlists'] });
    }
  });

  // Activate watchlist mutation
  const activateWatchlistMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/watchlist/watchlists/${id}/activate`);
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist/watchlists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist/watchlists/current'] });
      if (onWatchlistChange) {
        onWatchlistChange(data);
      }
    }
  });

  const handleCreateWatchlist = () => {
    if (newWatchlistName.trim()) {
      createWatchlistMutation.mutate({
        name: newWatchlistName.trim(),
        description: newWatchlistDescription.trim() || undefined
      });
    }
  };

  const handleEditWatchlist = () => {
    if (editingWatchlist && newWatchlistName.trim()) {
      updateWatchlistMutation.mutate({
        id: editingWatchlist.id,
        data: {
          name: newWatchlistName.trim(),
          description: newWatchlistDescription.trim() || undefined
        }
      });
    }
  };

  const handleDeleteWatchlist = (watchlist: Watchlist) => {
    if (watchlist.isDefault) {
      alert('Cannot delete the default watchlist');
      return;
    }
    
    if (confirm(`Are you sure you want to delete "${watchlist.name}"? This action cannot be undone.`)) {
      deleteWatchlistMutation.mutate(watchlist.id);
    }
  };

  const handleDuplicateWatchlist = (watchlist: Watchlist) => {
    const newName = prompt(`Enter name for copy of "${watchlist.name}":`, `${watchlist.name} Copy`);
    if (newName && newName.trim()) {
      duplicateWatchlistMutation.mutate({
        id: watchlist.id,
        name: newName.trim()
      });
    }
  };

  const handleActivateWatchlist = (watchlist: Watchlist) => {
    activateWatchlistMutation.mutate(watchlist.id);
  };

  const openEditDialog = (watchlist: Watchlist) => {
    setEditingWatchlist(watchlist);
    setNewWatchlistName(watchlist.name);
    setNewWatchlistDescription(watchlist.description || '');
    setShowEditDialog(true);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading watchlists...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Watchlist Manager</h2>
          <p className="text-sm text-gray-600">
            Manage multiple watchlists • Current: {currentWatchlist?.name || 'None'}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          New Watchlist
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {watchlists.map((watchlist: Watchlist) => (
          <Card 
            key={watchlist.id} 
            className={`cursor-pointer transition-all hover:shadow-md ${
              currentWatchlist?.id === watchlist.id ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''
            }`}
            onClick={() => handleActivateWatchlist(watchlist)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {watchlist.isDefault ? (
                    <Star className="h-4 w-4 text-yellow-500" />
                  ) : currentWatchlist?.id === watchlist.id ? (
                    <FolderOpen className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Folder className="h-4 w-4 text-gray-400" />
                  )}
                  <CardTitle className="text-base">{watchlist.name}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleActivateWatchlist(watchlist);
                    }}>
                      {currentWatchlist?.id === watchlist.id ? (
                        <StarOff className="mr-2 h-4 w-4" />
                      ) : (
                        <Star className="mr-2 h-4 w-4" />
                      )}
                      {currentWatchlist?.id === watchlist.id ? 'Active' : 'Activate'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(watchlist);
                    }}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateWatchlist(watchlist);
                    }}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {!watchlist.isDefault && (
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWatchlist(watchlist);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {watchlist.description && (
                <CardDescription>{watchlist.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Symbols:</span>
                  <Badge variant="outline">{watchlist.symbols.length}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Updated:</span>
                  <span className="text-xs text-gray-500">
                    {new Date(watchlist.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                {watchlist.isDefault && (
                  <Badge variant="secondary" className="text-xs">
                    Default
                  </Badge>
                )}
                {currentWatchlist?.id === watchlist.id && (
                  <Badge className="text-xs bg-blue-600">
                    Active
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Watchlist Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Watchlist</DialogTitle>
            <DialogDescription>
              Create a new watchlist to organize your symbols by strategy, sector, or any criteria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Growth Stocks, Tech Sector, Day Trading"
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose or criteria for this watchlist..."
                value={newWatchlistDescription}
                onChange={(e) => setNewWatchlistDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateWatchlist}
                disabled={createWatchlistMutation.isPending || !newWatchlistName.trim()}
              >
                {createWatchlistMutation.isPending ? 'Creating...' : 'Create Watchlist'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Watchlist Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Watchlist</DialogTitle>
            <DialogDescription>
              Update the name and description of your watchlist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="Watchlist name"
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                placeholder="Describe the purpose or criteria for this watchlist..."
                value={newWatchlistDescription}
                onChange={(e) => setNewWatchlistDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleEditWatchlist}
                disabled={updateWatchlistMutation.isPending || !newWatchlistName.trim()}
              >
                {updateWatchlistMutation.isPending ? 'Updating...' : 'Update Watchlist'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
