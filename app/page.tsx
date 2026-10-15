import GameContainer from './components/Game/GameContainer';

export default function Home() {
  return (
    <main className="relative w-full h-dvh overflow-hidden bg-black">
      <GameContainer className="h-[90vh]" />
      <div className="absolute bottom-0 left-0 w-full h-[10vh] bg-yellow-400 flex items-center justify-center text-black font-bold text-lg tracking-tighter uppercase">
        Built with Kilo Code and Anaconda Packages in 1 prompt, 15 minutes, and $1.59
      </div>
    </main>
  );
}
