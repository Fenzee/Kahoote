export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#105981] via-[#09799E] to-[#58B8CE] flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold mb-2">Memuat Game...</h2>
        <p className="text-white/80">Mohon tunggu sebentar</p>
      </div>
    </div>
  );
}
