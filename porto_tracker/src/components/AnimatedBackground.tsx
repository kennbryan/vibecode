/**
 * Animated background with floating gradient orbs.
 * Pure CSS — no JS animation loop, just CSS keyframes for performance.
 */
export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {/* Large accent orb top-left */}
      <div
        className="floating-orb absolute -top-[20%] -left-[10%] h-[600px] w-[600px]"
        style={{
          background: 'radial-gradient(circle, rgba(201, 247, 126, 0.12) 0%, transparent 70%)',
          animationDelay: '0s',
          animationDuration: '20s',
        }}
      />

      {/* Secondary orb top-right */}
      <div
        className="floating-orb absolute top-[10%] -right-[5%] h-[500px] w-[500px]"
        style={{
          background: 'radial-gradient(circle, rgba(161, 161, 170, 0.08) 0%, transparent 70%)',
          animationDelay: '-5s',
          animationDuration: '25s',
        }}
      />

      {/* Accent orb bottom-right */}
      <div
        className="floating-orb absolute -bottom-[15%] right-[20%] h-[700px] w-[700px]"
        style={{
          background: 'radial-gradient(circle, rgba(201, 247, 126, 0.08) 0%, transparent 70%)',
          animationDelay: '-10s',
          animationDuration: '22s',
        }}
      />

      {/* Small dark orb bottom-left */}
      <div
        className="floating-orb absolute bottom-[20%] -left-[10%] h-[400px] w-[400px]"
        style={{
          background: 'radial-gradient(circle, rgba(63, 63, 70, 0.15) 0%, transparent 70%)',
          animationDelay: '-15s',
          animationDuration: '18s',
        }}
      />

      {/* Center subtle glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(201, 247, 126, 0.04) 0%, transparent 60%)',
          animation: 'pulse-glow 6s ease-in-out infinite',
        }}
      />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 grid-pattern opacity-50" />

      {/* Noise texture */}
      <div className="absolute inset-0 noise-overlay" />
    </div>
  )
}
