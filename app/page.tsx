import GameContainer from './components/Game/GameContainer';

export default function Home() {
  return (
    <main className="relative w-full h-dvh overflow-hidden bg-black">
      <div className="h-[90vh] w-full">
        <GameContainer />
      </div>
      <div className="absolute bottom-0 left-0 w-full h-[10vh] flex items-center justify-center text-center px-4 kiloman-banner">
        Built with Kilo Code and Anaconda Packages in 1 prompt, 15 minutes, and $1.59
      </div>
    </main>
  );
}
