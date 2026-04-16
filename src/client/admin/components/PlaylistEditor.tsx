import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useApi } from '@shared/hooks/useApi';
import type { PlaylistItem, Media } from '@shared/types';

interface Props {
  token: string;
  profileId: string;
}

interface SortableItemProps {
  item: PlaylistItem;
  onRemove: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
}

function SortableItem({ item, onRemove, onDurationChange }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-gray-50 p-3 rounded border"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-gray-400">
        ⋮⋮
      </button>
      <div className="w-16 h-10 bg-gray-200 rounded overflow-hidden flex-shrink-0">
        {item.media.fileType === 'video' ? (
          <video src={item.media.filePath} className="w-full h-full object-cover" />
        ) : (
          <img src={item.media.filePath} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.media.originalName}</p>
        <p className="text-xs text-gray-500">{item.media.fileType}</p>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Duration:</label>
        <input
          type="number"
          min="1"
          max="300"
          value={item.duration}
          onChange={(e) => onDurationChange(item.id, parseInt(e.target.value) || 10)}
          className="w-16 px-2 py-1 border rounded text-sm"
        />
        <span className="text-xs text-gray-500">s</span>
      </div>
      <button
        onClick={() => onRemove(item.id)}
        className="text-red-500 hover:text-red-700 px-2"
      >
        ×
      </button>
    </div>
  );
}

export default function PlaylistEditor({ token, profileId }: Props) {
  const { fetchApi } = useApi(token);
  const queryClient = useQueryClient();
  const [localItems, setLocalItems] = useState<PlaylistItem[] | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset local state when switching profiles
  useEffect(() => {
    setLocalItems(null);
    setHasChanges(false);
  }, [profileId]);

  const { data: serverItems = [] } = useQuery({
    queryKey: ['playlist', profileId],
    queryFn: async () => {
      const fullItems = await fetchApi<PlaylistItem[]>(
        `/api/profiles/${profileId}/playlist-full`
      ).catch(() => []);
      return fullItems;
    },
  });

  const items = localItems ?? serverItems;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const saveMutation = useMutation({
    mutationFn: async (items: PlaylistItem[]) => {
      await fetchApi(`/api/profiles/${profileId}/playlist`, {
        method: 'POST',
        body: JSON.stringify({
          items: items.map((item) => ({
            mediaId: item.mediaId,
            duration: Number(item.duration),
          })),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', profileId] });
      setLocalItems(null);
      setHasChanges(false);
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setLocalItems(newItems);
      setHasChanges(true);
    }
  };

  const handleRemove = (id: string) => {
    const newItems = items.filter((i) => i.id !== id);
    setLocalItems(newItems);
    setHasChanges(true);
  };

  const handleDurationChange = (id: string, duration: number) => {
    const newItems = items.map((i) =>
      i.id === id ? { ...i, duration } : i
    );
    setLocalItems(newItems);
    setHasChanges(true);
  };

  const handleAddMedia = (media: Media) => {
    const newItem: PlaylistItem = {
      id: `temp-${Date.now()}`,
      profileId,
      mediaId: media.id,
      orderIndex: items.length,
      duration: media.fileType === 'video' ? (media.duration || 30) : 10,
      media,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLocalItems([...items, newItem]);
    setHasChanges(true);
  };

  // Expose addMedia method via window for MediaLibrary
  useEffect(() => {
    (window as any).__addToPlaylist = handleAddMedia;

    return () => {
      delete (window as any).__addToPlaylist;
    };
  }, [handleAddMedia]);

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Current Playlist</h2>
        {hasChanges && (
          <button
            onClick={() => saveMutation.mutate(items)}
            disabled={saveMutation.isPending}
            className="bg-agribank-green text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Playlist'}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No items in playlist. Add media from the library below.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onRemove={handleRemove}
                  onDurationChange={handleDurationChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
