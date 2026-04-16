interface Props {
  token: string;
  screenId: string;
}

export default function PlaylistEditor({ screenId }: Props) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h2 className="text-lg font-semibold mb-4">Playlist for {screenId}</h2>
      <p className="text-gray-500">Playlist editor coming soon...</p>
    </div>
  );
}
