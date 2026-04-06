interface Props {
  onSignIn: () => void
  isLoading?: boolean
}

export default function LoginScreen({ onSignIn, isLoading }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1A2E] to-[#0F3460] flex flex-col items-center justify-center p-6 gap-8">
      <span className="text-7xl">🦠</span>
      <div className="text-center">
        <h1 className="text-5xl font-extrabold text-purple-500 tracking-widest">VIRUS!</h1>
        <p className="text-white/60 text-sm mt-2">El juego de cartas online</p>
      </div>
      <button
        onClick={onSignIn}
        disabled={isLoading}
        className="flex items-center gap-3 bg-white text-gray-800 font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
        {isLoading ? 'Entrando...' : 'Continuar con Google'}
      </button>
      <p className="text-white/30 text-xs">JB Games</p>
    </div>
  )
}
