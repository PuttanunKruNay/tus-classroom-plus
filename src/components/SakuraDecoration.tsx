export function SakuraDecoration() {
  const petals = [
    { left: '6%', delay: '0s', duration: '15s', size: 16, opacity: 0.45 },
    { left: '18%', delay: '3.5s', duration: '18s', size: 13, opacity: 0.35 },
    { left: '34%', delay: '7s', duration: '16s', size: 18, opacity: 0.4 },
    { left: '52%', delay: '1.8s', duration: '20s', size: 14, opacity: 0.32 },
    { left: '68%', delay: '5.5s', duration: '17s', size: 17, opacity: 0.42 },
    { left: '84%', delay: '2.5s', duration: '19s', size: 15, opacity: 0.38 },
    { left: '93%', delay: '8.5s', duration: '16s', size: 12, opacity: 0.35 }
  ];

  return (
    <div aria-hidden="true" className="hidden md:block pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Soft Pink-Blush Aurora Orbs */}
      <div className="ambient-orb-1 absolute -top-28 -left-24 w-80 h-80 sm:w-[440px] sm:h-[440px] rounded-full bg-pink-300/30 blur-3xl" />
      <div className="ambient-orb-2 absolute top-1/4 -right-28 w-80 h-80 sm:w-[460px] sm:h-[460px] rounded-full bg-rose-300/25 blur-3xl" />
      <div className="ambient-orb-1 absolute -bottom-28 left-1/4 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-fuchsia-200/25 blur-3xl" />
      <div className="ambient-orb-2 absolute bottom-1/4 right-1/4 w-60 h-60 rounded-full bg-pink-200/30 blur-3xl" />

      {/* Gently Falling Sakura Petals (Pure CSS, Zero JS overhead) */}
      {petals.map((p, idx) => (
        <svg
          key={idx}
          viewBox="0 0 24 24"
          width={p.size}
          height={p.size}
          className="sakura-petal absolute -top-8"
          style={{
            left: p.left,
            opacity: p.opacity,
            animationDelay: p.delay,
            animationDuration: p.duration
          }}
        >
          <path
            d="M12 2C14.8 4.2 17.5 7.6 17.2 12.2C16.9 16.2 14.3 19.6 12 22C9.7 19.6 7.1 16.2 6.8 12.2C6.5 7.6 9.2 4.2 12 2Z"
            fill="#f472b6"
          />
          <path
            d="M12 5C13.6 6.8 15 9.2 14.8 12.2C14.6 14.8 13.3 17.1 12 18.8C10.7 17.1 9.4 14.8 9.2 12.2C9 9.2 10.4 6.8 12 5Z"
            fill="#fbcfe8"
          />
        </svg>
      ))}
    </div>
  );
}
