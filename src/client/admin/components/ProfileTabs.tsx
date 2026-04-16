import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@shared/hooks/useApi';
import type { Profile } from '@shared/types';

interface Props {
  token: string;
  screenId: string;
  selectedProfileId: string | null;
  onSelectProfile: (profileId: string | null) => void;
}

export default function ProfileTabs({ token, screenId, selectedProfileId, onSelectProfile }: Props) {
  const { fetchApi } = useApi(token);
  const queryClient = useQueryClient();

  const {
    data: profiles = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['profiles', screenId],
    queryFn: () => fetchApi<Profile[]>(`/api/profiles/by-screen/${screenId}`),
  });

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.isActive) ?? profiles[0] ?? null,
    [profiles]
  );

  useEffect(() => {
    if (profiles.length === 0) {
      onSelectProfile(null);
      return;
    }

    const selectedExists = selectedProfileId
      ? profiles.some((profile) => profile.id === selectedProfileId)
      : false;

    if (!selectedExists) {
      onSelectProfile(activeProfile?.id ?? profiles[0].id);
    }
  }, [profiles, selectedProfileId, onSelectProfile, activeProfile]);

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      return fetchApi<Profile>(`/api/profiles/by-screen/${screenId}`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: (newProfile) => {
      queryClient.invalidateQueries({ queryKey: ['profiles', screenId] });
      onSelectProfile(newProfile.id);
    },
    onError: (error: Error) => {
      alert(error.message || 'Failed to create profile');
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (profileId: string) => {
      await fetchApi(`/api/profiles/${profileId}/activate`, {
        method: 'PUT',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles', screenId] });
    },
    onError: (error: Error) => {
      alert(error.message || 'Failed to set active profile');
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ profileId, name }: { profileId: string; name: string }) => {
      await fetchApi(`/api/profiles/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles', screenId] });
    },
    onError: (error: Error) => {
      alert(error.message || 'Failed to rename profile');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (profileId: string) => {
      await fetchApi(`/api/profiles/${profileId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_, profileId) => {
      queryClient.invalidateQueries({ queryKey: ['profiles', screenId] });
      if (selectedProfileId === profileId) {
        onSelectProfile(null);
      }
    },
    onError: (error: Error) => {
      alert(error.message || 'Failed to delete profile');
    },
  });

  const isMutating =
    createMutation.isPending ||
    activateMutation.isPending ||
    renameMutation.isPending ||
    deleteMutation.isPending;

  const handleCreateProfile = () => {
    const input = prompt('Enter profile name');
    if (!input) return;

    const name = input.trim();
    if (!name) {
      alert('Profile name is required');
      return;
    }

    createMutation.mutate(name);
  };

  const handleRenameProfile = (profile: Profile) => {
    const input = prompt('Rename profile', profile.name);
    if (!input) return;

    const name = input.trim();
    if (!name || name === profile.name) {
      return;
    }

    renameMutation.mutate({ profileId: profile.id, name });
  };

  const handleDeleteProfile = (profile: Profile) => {
    if (profiles.length <= 1) {
      return;
    }

    if (!confirm(`Delete profile "${profile.name}"?`)) {
      return;
    }

    deleteMutation.mutate(profile.id);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <p className="text-sm text-gray-500">Loading profiles...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <p className="text-sm text-red-600">Failed to load profiles.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold">Profiles</h2>
        <button
          onClick={handleCreateProfile}
          disabled={isMutating}
          className="bg-agribank-green text-white px-3 py-1.5 rounded hover:bg-agribank-dark disabled:opacity-50"
        >
          + Profile
        </button>
      </div>

      {profiles.length === 0 ? (
        <p className="text-sm text-gray-500">No profiles found for this screen.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {profiles.map((profile) => {
              const isSelected = profile.id === selectedProfileId;
              return (
                <button
                  key={profile.id}
                  onClick={() => onSelectProfile(profile.id)}
                  className={`px-3 py-2 rounded border text-sm transition-colors ${
                    isSelected
                      ? 'border-agribank-green bg-red-50 text-agribank-green font-medium'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {profile.name}
                    {profile.isActive && <span title="Active profile">★</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedProfileId && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(() => {
                const selected = profiles.find((profile) => profile.id === selectedProfileId);
                if (!selected) return null;

                return (
                  <>
                    <button
                      onClick={() => activateMutation.mutate(selected.id)}
                      disabled={isMutating || selected.isActive}
                      className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      Set Active
                    </button>
                    <button
                      onClick={() => handleRenameProfile(selected)}
                      disabled={isMutating}
                      className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDeleteProfile(selected)}
                      disabled={isMutating || profiles.length <= 1}
                      className="px-3 py-1.5 text-sm border border-red-200 text-red-700 rounded hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
