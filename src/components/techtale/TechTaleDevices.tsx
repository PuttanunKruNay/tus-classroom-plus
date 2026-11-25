'use client';

import { useEffect, useState } from 'react';
import { Flame, Droplets, Sun, Moon, Leaf, Cloud } from 'lucide-react';
import type { TechTaleComponentType } from '@/lib/techtale-data';

export function RealisticResistor220() {
  return (
    <div className="inline-flex items-center select-none" aria-label="ตัวต้านทาน 220 โอห์ม">
      <div className="w-5 h-1 bg-gradient-to-b from-neutral-400 via-white to-neutral-500 rounded-l" />
      <div className="w-14 h-5 rounded-md border-2 border-neutral-900 bg-gradient-to-b from-[#f3dfb8] via-[#d9bf8c] to-[#bf9e68] flex items-center justify-center gap-1.5 px-1 shadow-sm">
        <span className="w-1 h-full bg-red-600" />
        <span className="w-1 h-full bg-red-600" />
        <span className="w-1 h-full bg-amber-900" />
        <span className="w-1" />
        <span className="w-1 h-full bg-amber-400" />
      </div>
      <div className="w-5 h-1 bg-gradient-to-b from-neutral-400 via-white to-neutral-500 rounded-r" />
    </div>
  );
}

export function VectorBoardArt({ boardType }: { boardType: 'Arduino' | 'ESP32' }) {
  if (boardType === 'Arduino') {
    return (
      <div className="relative w-[156px] h-[200px] rounded-2xl bg-[#00748c] border-[3.5px] border-neutral-950 shadow-[4px_6px_0_rgba(0,0,0,0.3)] mx-auto select-none overflow-hidden">
        {/* Top & Bottom pin headers */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1 bg-neutral-800 px-1.5 py-1 rounded border border-black">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="w-2 h-2.5 bg-black rounded-[1px]" />
          ))}
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-neutral-800 px-1.5 py-1 rounded border border-black">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="w-2 h-2.5 bg-black rounded-[1px]" />
          ))}
        </div>
        {/* USB port */}
        <div className="absolute top-7 left-2 w-9 h-11 rounded bg-neutral-300 border-2 border-black shadow-inner" />
        {/* DC barrel jack */}
        <div className="absolute bottom-7 left-2 w-8 h-9 rounded bg-neutral-900 border-2 border-black" />
        {/* ATmega328P chip */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-20 rounded bg-neutral-900 border-2 border-black flex flex-col justify-around py-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="w-full h-0.5 bg-neutral-500/40" />
          ))}
        </div>
        {/* UNO watermark */}
        <div className="absolute left-10 top-1/2 -translate-y-1/2 -rotate-90 font-heading font-black text-2xl text-white/40 tracking-wider">
          UNO
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-[156px] h-[200px] rounded-xl bg-neutral-900 border-[3.5px] border-black shadow-[4px_6px_0_rgba(0,0,0,0.35)] mx-auto select-none overflow-hidden">
      {/* Side pins */}
      <div className="absolute left-1.5 top-4 bottom-4 flex flex-col justify-between">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="w-2.5 h-1.5 bg-neutral-400 rounded-[1px]" />
        ))}
      </div>
      <div className="absolute right-1.5 top-4 bottom-4 flex flex-col justify-between">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="w-2.5 h-1.5 bg-neutral-400 rounded-[1px]" />
        ))}
      </div>
      {/* Wi-Fi Antenna */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-16 h-5 border-2 border-amber-400/70 border-b-0 rounded-t" />
      {/* RF Shield */}
      <div className="absolute top-9 left-1/2 -translate-x-1/2 w-20 h-24 rounded-md bg-neutral-300 border-2 border-black flex flex-col items-center justify-center">
        <span className="font-mono font-black text-[11px] text-neutral-700">ESP-WROOM</span>
        <span className="font-mono font-bold text-[10px] text-neutral-500">3.3V Wi-Fi</span>
      </div>
      {/* Label */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 font-heading font-black text-lg text-white/85">
        ESP32
      </div>
      {/* USB-C */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-9 h-5 rounded bg-neutral-400 border-2 border-black" />
    </div>
  );
}

interface DeviceBodyProps {
  type: TechTaleComponentType;
  moduleColor: string;
  isRunning: boolean;
  hasExploded: boolean;
}

export function TechTaleDeviceVisual({ type, moduleColor, isRunning, hasExploded }: DeviceBodyProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isRunning) {
      setTick(0);
      return;
    }
    const id = window.setInterval(() => setTick(t => t + 1), 250);
    return () => window.clearInterval(id);
  }, [isRunning]);

  // Subtle Web Audio beep when Buzzer / Siren / Alarm is running (muted by default unless triggered interactively)
  if (hasExploded) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 animate-bounce">
        <div className="relative flex items-center justify-center">
          <Cloud className="w-16 h-16 text-neutral-500 fill-neutral-600" />
          <Flame className="w-8 h-8 text-orange-500 fill-orange-400 absolute" />
        </div>
        <span className="text-xs font-heading font-extrabold text-red-500">💥 อุปกรณ์ไหม้!</span>
      </div>
    );
  }

  switch (type) {
    case 'led':
      return <LedBulb color={moduleColor} isOn={isRunning} intensity={1} />;

    case 'dimmerLED': {
      const intensity = isRunning ? (Math.sin(tick * 0.5) + 1) / 2 : 0;
      return (
        <div className="flex flex-col items-center gap-1">
          <LedBulb color={moduleColor} isOn={isRunning} intensity={intensity} />
          <span className="text-[11px] font-mono font-bold text-[var(--text-secondary)]">
            PWM: {isRunning ? Math.round(intensity * 255) : 0}/255
          </span>
        </div>
      );
    }

    case 'fan':
      return (
        <div className="relative w-24 h-24 rounded-2xl bg-neutral-800 border-[3px] border-black flex items-center justify-center shadow-inner">
          <div className="w-20 h-20 rounded-full bg-neutral-950 flex items-center justify-center relative overflow-hidden">
            <div
              className="relative w-16 h-16 flex items-center justify-center"
              style={isRunning ? { animation: 'spin 0.45s linear infinite' } : undefined}
            >
              {[0, 90, 180, 270].map(deg => (
                <div
                  key={deg}
                  className="absolute w-5 h-9 rounded-full bg-cyan-400 border border-black"
                  style={{ transform: `rotate(${deg}deg) translateY(-13px)` }}
                />
              ))}
              <div className="w-6 h-6 rounded-full bg-neutral-300 border-2 border-black z-10" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-neutral-500/40 pointer-events-none" />
          </div>
        </div>
      );

    case 'pump':
      return (
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative flex items-center justify-center">
            {isRunning && (
              <Droplets className="w-6 h-6 text-cyan-500 animate-bounce absolute -top-7" />
            )}
            <div className="w-20 h-14 rounded-xl bg-neutral-300 border-[3px] border-black flex items-center justify-between px-2 shadow-sm">
              <div
                className="w-9 h-9 rounded-full bg-neutral-700 border-2 border-black flex items-center justify-center"
                style={isRunning ? { animation: 'spin 0.6s linear infinite' } : undefined}
              >
                <div className="w-5 h-1 bg-cyan-400 rounded" />
              </div>
              <span className="font-mono font-black text-[11px] text-neutral-900">PUMP</span>
            </div>
          </div>
          <span className={`text-xs font-heading font-bold ${isRunning ? 'text-cyan-600' : 'text-neutral-500'}`}>
            {isRunning ? '💦 กำลังสูบน้ำรดผัก!' : 'รอคำสั่งเปิดปั๊ม'}
          </span>
        </div>
      );

    case 'buzzer':
      return (
        <div className="relative flex items-center justify-center w-24 h-24">
          {isRunning && (
            <span className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-70" />
          )}
          <div className="w-20 h-20 rounded-full bg-neutral-900 border-[3.5px] border-black flex items-center justify-center relative shadow-md">
            <div className="w-6 h-6 rounded-full bg-black border border-neutral-700" />
            <span className="absolute top-2.5 right-3.5 text-white font-black text-sm">+</span>
            {isRunning && (
              <span className="absolute -bottom-6 text-xs font-mono font-bold text-red-500 whitespace-nowrap">
                🔊 1000 Hz!
              </span>
            )}
          </div>
        </div>
      );

    case 'trafficLight': {
      // 3s Red, 1s Yellow, 2s Green (in 250ms ticks: 12, 4, 8 -> cycle 24)
      const phase = tick % 24;
      const active = !isRunning ? -1 : phase < 12 ? 0 : phase < 16 ? 1 : 2;
      return (
        <div className="w-14 py-2 rounded-2xl bg-neutral-900 border-[3px] border-black flex flex-col items-center gap-2 shadow-md">
          {[
            { color: '#EF4444', on: active === 0 },
            { color: '#FACC15', on: active === 1 },
            { color: '#22C55E', on: active === 2 }
          ].map((l, idx) => (
            <div
              key={idx}
              className="w-7 h-7 rounded-full border-2 border-black transition-all"
              style={{
                backgroundColor: l.on ? l.color : `${l.color}33`,
                boxShadow: l.on ? `0 0 14px ${l.color}` : 'none'
              }}
            />
          ))}
        </div>
      );
    }

    case 'buttonLamp': {
      const pressed = isRunning && Math.floor(tick / 6) % 2 === 0;
      return (
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-neutral-700 border-[3px] border-black flex items-center justify-center">
            <div
              className={`w-9 h-9 rounded-full bg-blue-500 border-2 border-black transition-transform ${
                pressed ? 'scale-90 translate-y-0.5 bg-blue-400' : ''
              }`}
            />
          </div>
          <LedBulb color="#EF4444" isOn={pressed} intensity={1} small />
        </div>
      );
    }

    case 'sirenLED': {
      const phase = tick % 2 === 0;
      return (
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-full bg-neutral-900 border-[3px] border-black flex items-center justify-center">
            {isRunning && <span className="absolute inset-0 rounded-full border-2 border-purple-500 animate-ping" />}
            <span className="text-xs font-mono font-bold text-white">{isRunning ? (phase ? '800' : '1200') : 'Hz'}</span>
          </div>
          <LedBulb color="#EF4444" isOn={isRunning && phase} intensity={1} small />
        </div>
      );
    }

    case 'lightSensor': {
      const night = isRunning && Math.floor(tick / 8) % 2 === 1;
      return (
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-full bg-neutral-800 border-[3px] border-black flex items-center justify-center">
              {night ? <Moon className="w-7 h-7 text-indigo-400" /> : <Sun className="w-7 h-7 text-yellow-400" />}
            </div>
            <span className="text-[10px] font-mono font-bold text-neutral-500">LDR</span>
          </div>
          <span className="font-bold text-neutral-500">→</span>
          <LedBulb color="#FACC15" isOn={night} intensity={1} small />
        </div>
      );
    }

    case 'soilStation':
      return (
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-6 rounded bg-neutral-700 border-2 border-black" />
            <div className="flex gap-1.5">
              <div className="w-1.5 h-7 bg-amber-800 rounded-b" />
              <div className="w-1.5 h-7 bg-amber-800 rounded-b" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Droplets className={`w-5 h-5 ${isRunning ? 'text-cyan-500 animate-bounce' : 'text-neutral-400'}`} />
            <Leaf className={`w-10 h-10 transition-colors ${isRunning ? 'text-green-500' : 'text-neutral-500'}`} />
          </div>
        </div>
      );

    case 'alarmSystem': {
      const blink = Math.floor(tick / 2) % 2 === 0;
      return (
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-lg bg-neutral-700 border-2 border-black flex items-center justify-center">
            <div className={`w-7 h-7 rounded-full bg-blue-500 border-2 border-black ${isRunning ? 'scale-90' : ''}`} />
          </div>
          <LedBulb color="#EF4444" isOn={isRunning && blink} intensity={1} small />
          <div className="relative w-12 h-12 rounded-full bg-neutral-900 border-2 border-black flex items-center justify-center">
            {isRunning && <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping" />}
            <span className="text-[10px] font-mono font-bold text-white">1kHz</span>
          </div>
        </div>
      );
    }
  }
}

function LedBulb({
  color,
  isOn,
  intensity,
  small = false
}: {
  color: string;
  isOn: boolean;
  intensity: number;
  small?: boolean;
}) {
  const glow = isOn ? Math.max(0.2, intensity) : 0;
  return (
    <div className={`flex flex-col items-center ${small ? 'scale-90' : ''}`}>
      <div
        className="w-12 h-14 rounded-t-full border-[3px] border-neutral-900 relative transition-all"
        style={{
          backgroundColor: isOn ? color : `${color}55`,
          opacity: isOn ? 0.45 + 0.55 * glow : 0.65,
          boxShadow: isOn ? `0 0 ${Math.round(28 * glow)}px ${color}` : 'none'
        }}
      >
        <div className="absolute top-2.5 left-2 w-2 h-5 rounded-full bg-white/60" />
      </div>
      <div className="w-14 h-3 rounded-full border-2 border-neutral-900" style={{ backgroundColor: `${color}cc` }} />
    </div>
  );
}
