export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-surface-200" />
          <div className="absolute inset-0 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-gray-400 font-display text-sm tracking-wide">Loading MedConnect...</p>
      </div>
    </div>
  );
}
