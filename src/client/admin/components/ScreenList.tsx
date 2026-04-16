import { useQuery } from '@tanstack/react-query';
import { useApi } from '@shared/hooks/useApi';
import type { Screen } from '@shared/types';

interface Props {
  token: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ScreenList({ token, selectedId, onSelect }: Props) {
  const { fetchApi } = useApi(token);

  const { data: screens = [], isLoading } = useQuery({
    queryKey: ['screens'],
    queryFn: () => fetchApi<Screen[]>('/api/screens'),
  });

  if (isLoading) {
    return <div className="p-4 text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
        Screens
      </h2>
      <div className="space-y-2">
        {screens.map((screen) => (
          <button
            key={screen.id}
            onClick={() => onSelect(screen.id)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selectedId === screen.id
                ? 'border-agribank-green bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{screen.name}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  screen.status === 'online' ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            </div>
            <div className="mt-1 space-y-1">
              {screen.location && (
                <p className="text-sm text-gray-500">{screen.location}</p>
              )}
              <p className="text-xs text-gray-400">
                Resolution: {screen.resolution || 'Not set'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
