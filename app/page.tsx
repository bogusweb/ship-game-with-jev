import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-[#fefce4] px-6 py-16">
      <main className="flex w-full max-w-xl flex-col items-center gap-8 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-[#2c1810] sm:text-5xl">
            <span className="text-[#dc6b5e]">ship</span>{" "}
            <span className="text-[#2c1810]">game</span>{" "}
            <span className="text-[#4a9d93]">with jev</span>
          </h1>
          <p className="text-base text-[#5c4a3a]/80">
            A browser proof of concept: classic Battleship against Jev.
          </p>
        </div>

        <Button
          size="lg"
          className="bg-[#e8ba3f] text-[#2c1810] hover:bg-[#d9ab30]"
          disabled
        >
          Play coming soon
        </Button>

        <p className="text-sm text-[#5c4a3a]/70">
          Stage 1 scaffold complete — game logic arrives in the next stages.
        </p>
      </main>
    </div>
  );
}
