interface Props {
  token: string;
  screenId: string;
}

export default function MediaLibrary({ token }: Props) {
  return (
    <div className="bg-white rounded-lg border p-4 h-full overflow-auto">
      <h2 className="text-lg font-semibold mb-4">Media Library</h2>
      <p className="text-gray-500">Media library coming soon...</p>
    </div>
  );
}
