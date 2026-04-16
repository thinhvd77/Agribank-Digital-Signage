import Player from './Player';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const screenId = params.get('screen');

  if (!screenId) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white">
        <p className="text-xl">Missing screen parameter</p>
        <p className="text-sm mt-2 text-gray-400">URL: /player?screen=&lt;screen-uuid&gt;</p>
      </div>
    );
  }

  return <Player screenId={screenId} />;
}
