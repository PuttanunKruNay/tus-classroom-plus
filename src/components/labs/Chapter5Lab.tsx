'use client';

import { useState } from 'react';
import { Cog, Zap, Cpu, Radio, Volume2, VolumeX, Scissors } from 'lucide-react';

interface Chapter5LabProps {
  currentStepIdx: number;
  onSelectStep: (idx: number) => void;
}

const SEVEN_GEARS = [
  { id: 'spur', name: '1. เฟืองตรง (Spur)', desc: 'ฟันเฟืองขนานกับแกนเพลา ส่งกำลังระหว่างเพลาที่ขนานกัน เฟืองตัวตามหมุนสวนทางกับตัวขับ' },
  { id: 'rack', name: '2. เฟืองสะพาน (Rack)', desc: 'เปลี่ยนการเคลื่อนที่แบบหมุนให้เป็นการเคลื่อนที่แนวเส้นตรง เช่น ระบบพวงมาลัยรถยนต์และประตูเลื่อน' },
  { id: 'internal', name: '3. เฟืองวงแหวน (Internal)', desc: 'ฟันเฟืองอยู่ด้านในของวงแหวน ทำให้เฟืองตัวขับและตัวตามหมุนไปในทิศทางเดียวกัน' },
  { id: 'helical', name: '4. เฟืองเฉียง (Helical)', desc: 'ฟันเฟืองเอียงทำมุมกับแกนเพลา เดินเรียบ เสียงเงียบ และรับแรงได้มากกว่าเฟืองตรง' },
  { id: 'bevel', name: '5. เฟืองดอกจอก (Bevel)', desc: 'เปลี่ยนทิศทางการส่งกำลังระหว่างเพลาที่ตั้งฉากกัน (90 องศา) เช่น สว่านมือหมุน' },
  { id: 'worm', name: '6. เฟืองตัวหนอน (Worm)', desc: 'ลดความเร็วรอบและเพิ่มแรงบิดได้สูงมาก ป้องกันการหมุนย้อนกลับได้ดี' },
  { id: 'spiral', name: '7. เฟืองเกลียวสกรู (Spiral)', desc: 'ส่งกำลังระหว่างเพลาที่ไขว้กันหรือไม่ขนานกันอย่างนุ่มนวล' }
];

const THREE_PULLEYS = [
  { id: 'fixed', name: 'รอกเดี่ยวตายตัว', factor: 1, note: 'ไม่ผ่อนแรง (ออกแรงเท่ากับน้ำหนักวัตถุ) แต่ช่วยเปลี่ยนทิศทางแรงดึงให้สะดวกขึ้น' },
  { id: 'movable', name: 'รอกเดี่ยวเคลื่อนที่', factor: 2, note: 'ช่วยผ่อนแรงได้ครึ่งหนึ่ง (ออกแรงเพียง 1/2 ของน้ำหนักวัตถุ)' },
  { id: 'compound', name: 'รอกพวง (ระบบรอก)', factor: 4, note: 'ช่วยผ่อนแรงได้มากตามจำนวนเส้นเชือกที่รับน้ำหนัก (เช่น 1/4 ของน้ำหนักวัตถุ)' }
];

export function Chapter5Lab({ currentStepIdx, onSelectStep }: Chapter5LabProps) {
  const activeTab = currentStepIdx % 4;

  // Room A: Gears & Pulleys
  const [gearId, setGearId] = useState('spur');
  const [drivenTeeth, setDrivenTeeth] = useState(24);
  const driverTeeth = 24;
  const driverRpm = 60;
  const drivenRpm = Math.round((driverRpm * driverTeeth) / drivenTeeth);
  const torqueRatio = (drivenTeeth / driverTeeth).toFixed(2);
  const [pulleyId, setPulleyId] = useState('movable');
  const [loadWeight, setLoadWeight] = useState(40);

  // Room B: DC vs AC Fan
  const [dcSwitchOn, setDcSwitchOn] = useState(true);
  const [dcWireCut, setDcWireCut] = useState(false);
  const [acSwitchOn, setAcSwitchOn] = useState(true);
  const [acWireCut, setAcWireCut] = useState(false);

  // Room C: Electronics LDR + LED
  const [ambientLight, setAmbientLight] = useState(65);
  // ตามหนังสือ: แสงมาก ความต้านทานต่ำ (100 Ω - 10,000 Ω)
  const ldrResistance = Math.round(10000 - (ambientLight / 100) * 9800);
  const ledBrightness = Math.min(100, Math.max(8, Math.round((ambientLight / 100) * 100)));

  // Secondary Model: Smart Cane Ultrasonic
  const [obstacleCm, setObstacleCm] = useState(85);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const echoTimeUs = Math.round((obstacleCm * 2) / 0.0343); // v = 343 m/s = 0.0343 cm/us
  const alertLevel = obstacleCm <= 30 ? 'อันตรายใกล้มาก! (สั่นแรง + เสียงถี่)' : obstacleCm <= 80 ? 'ระวังสิ่งกีดขวาง (สั่นปานกลาง)' : 'ระยะปลอดภัย (ปกติ)';

  const activeGear = SEVEN_GEARS.find(g => g.id === gearId) || SEVEN_GEARS[0];
  const activePulley = THREE_PULLEYS.find(p => p.id === pulleyId) || THREE_PULLEYS[1];

  function playUltrasonicBeep(cm: number) {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = cm <= 30 ? 1100 : cm <= 80 ? 740 : 480;
      gain.gain.value = cm <= 30 ? 0.16 : 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
      setTimeout(() => void ctx.close(), 150);
    } catch {
      // Ignore if audio context blocked
    }
  }

  return (
    <div className="space-y-5">
      {/* แท็บเลือก 3 ห้องทดลอง + โมเดลรองไม้เท้าอัจฉริยะ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { label: 'ห้อง A : กลไก (เฟือง/รอก)', icon: Cog },
          { label: 'ห้อง B : ไฟฟ้า (DC / AC)', icon: Zap },
          { label: 'ห้อง C : อิเล็กทรอนิกส์ (LDR)', icon: Cpu },
          { label: 'โมเดลรอง : ไม้เท้าอัจฉริยะ', icon: Radio }
        ].map((tab, idx) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => onSelectStep(idx)}
              className={`min-h-[46px] px-3 py-2 rounded-xl text-xs sm:text-sm font-heading font-bold border-2 cursor-pointer transition inline-flex items-center gap-2 ${
                activeTab === idx
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ห้อง A: กลไก เฟือง 7 ชนิด + รอก 3 ชนิด */}
      {activeTab === 0 && (
        <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-5 animate-fade-up">
          <div className="space-y-3">
            <h3 className="font-heading font-bold text-lg">ห้อง A.1 : เฟือง 7 ชนิด & คำนวณความเร็วรอบ/แรงบิดจริง</h3>
            <div className="flex flex-wrap gap-1.5">
              {SEVEN_GEARS.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGearId(g.id)}
                  className={`min-h-[40px] px-3 rounded-xl text-xs sm:text-sm font-heading font-bold border-2 cursor-pointer ${
                    gearId === g.id
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)]'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
            <p className="text-sm sm:text-base p-3.5 rounded-xl bg-[var(--color-primary-soft)] border border-[var(--color-primary-border)]">
              <strong>{activeGear.name}:</strong> {activeGear.desc}
            </p>

            {/* จำลองเฟืองขับ-เฟืองตามหมุนสวนทาง + สไลเดอร์จำนวนฟัน */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-4">
              <div className="flex flex-wrap items-center justify-center gap-6 py-2">
                <div className="text-center">
                  <div
                    className="w-20 h-20 rounded-full border-4 border-dashed border-[var(--color-primary)] bg-[var(--color-primary-soft)] flex items-center justify-center font-mono font-bold text-sm text-[var(--color-primary)] mx-auto"
                    style={{ animation: 'spin 4s linear infinite' }}
                  >
                    {driverTeeth}T
                  </div>
                  <div className="text-xs font-heading font-bold mt-2">เฟืองขับ ({driverRpm} RPM ↻)</div>
                </div>
                <div className="text-center">
                  <div
                    className="rounded-full border-4 border-dashed border-[#D99B00] bg-[var(--color-gold-bg)] flex items-center justify-center font-mono font-bold text-sm text-[#946400] dark:text-[#F2B31B] mx-auto transition-all"
                    style={{
                      width: `${Math.round(56 + drivenTeeth * 1.1)}px`,
                      height: `${Math.round(56 + drivenTeeth * 1.1)}px`,
                      animation: `spin ${(4 * drivenTeeth) / driverTeeth}s linear infinite ${gearId === 'internal' ? 'normal' : 'reverse'}`
                    }}
                  >
                    {drivenTeeth}T
                  </div>
                  <div className="text-xs font-heading font-bold mt-2">
                    เฟืองตาม ({drivenRpm} RPM {gearId === 'internal' ? '↻ ทิศเดียวกัน' : '↺ สวนทาง'})
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-heading font-bold">
                  ปรับจำนวนฟันเฟืองตัวตาม: <span className="text-[var(--color-primary)]">{drivenTeeth} ฟัน</span> (เฟืองขับคงที่ {driverTeeth} ฟัน)
                </label>
                <input
                  type="range"
                  min={12}
                  max={48}
                  step={6}
                  value={drivenTeeth}
                  onChange={e => setDrivenTeeth(Number(e.target.value))}
                  className="w-full accent-[var(--color-primary)]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center text-sm">
                <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div className="text-xs text-[var(--text-muted)]">อัตราทด</div>
                  <div className="font-mono font-bold text-[var(--color-primary)]">{torqueRatio} : 1</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div className="text-xs text-[var(--text-muted)]">ความเร็วเฟืองตาม</div>
                  <div className="font-mono font-bold">{drivenRpm} RPM</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div className="text-xs text-[var(--text-muted)]">แรงบิดที่ได้</div>
                  <div className="font-mono font-bold text-[var(--color-gold)]">{torqueRatio}×</div>
                </div>
              </div>
            </div>
          </div>

          {/* รอก 3 ชนิด */}
          <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
            <h3 className="font-heading font-bold text-lg">ห้อง A.2 : รอก 3 ชนิด & แรงดึงเชือกที่ใช้จริง</h3>
            <div className="flex flex-wrap gap-2">
              {THREE_PULLEYS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPulleyId(p.id)}
                  className={`min-h-[42px] px-3.5 rounded-xl text-sm font-heading font-bold border-2 cursor-pointer ${
                    pulleyId === p.id
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)]'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-2.5">
              <label className="block text-sm font-heading font-bold">
                น้ำหนักวัตถุที่ต้องการยก: <span className="text-[var(--color-primary)]">{loadWeight} นิวตัน (N)</span>
              </label>
              <input
                type="range"
                min={20}
                max={100}
                step={10}
                value={loadWeight}
                onChange={e => setLoadWeight(Number(e.target.value))}
                className="w-full accent-[var(--color-primary)]"
              />
              <div className="text-base font-heading font-bold text-[var(--color-success)]">
                แรงดึงเชือกที่ใช้จริง ≈ {(loadWeight / activePulley.factor).toFixed(1)} นิวตัน (ผ่อนแรง {activePulley.factor} เท่า)
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{activePulley.note}</p>
            </div>
          </div>
        </section>
      )}

      {/* ห้อง B: ไฟฟ้า พัดลม DC เทียบ AC */}
      {activeTab === 1 && (
        <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4 animate-fade-up">
          <h3 className="font-heading font-bold text-lg">ห้อง B : เปรียบเทียบมอเตอร์ DC (แบตเตอรี่) และ AC (ไฟบ้าน)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: 'พัดลมมือถือ (มอเตอร์กระแสตรง DC)',
                source: 'แหล่งจ่ายไฟ: แบตเตอรี่ (DC)',
                on: dcSwitchOn,
                cut: dcWireCut,
                toggleOn: () => setDcSwitchOn(v => !v),
                toggleCut: () => setDcWireCut(v => !v)
              },
              {
                title: 'พัดลมตั้งโต๊ะ (มอเตอร์กระแสสลับ AC)',
                source: 'แหล่งจ่ายไฟ: ไฟบ้านกระแสสลับหนึ่งเฟส (AC)',
                on: acSwitchOn,
                cut: acWireCut,
                toggleOn: () => setAcSwitchOn(v => !v),
                toggleCut: () => setAcWireCut(v => !v)
              }
            ].map(fan => {
              const running = fan.on && !fan.cut;
              return (
                <div key={fan.title} className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-3">
                  <div className="font-heading font-bold text-base text-[var(--color-primary)]">{fan.title}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{fan.source}</div>
                  <div className="flex items-center gap-4 py-2">
                    <div
                      className={`w-20 h-20 rounded-full border-4 flex items-center justify-center font-heading font-extrabold text-xs ${
                        running
                          ? 'border-[var(--color-success)] bg-[var(--color-success-bg)] text-[var(--color-success)]'
                          : 'border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-muted)]'
                      }`}
                      style={running ? { animation: 'spin 0.8s linear infinite' } : undefined}
                    >
                      {running ? 'ใบพัดหมุน' : 'หยุดนิ่ง'}
                    </div>
                    <div className="text-sm space-y-1">
                      <div>
                        สถานะวงจร:{' '}
                        <strong className={running ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
                          {fan.cut ? 'สายไฟขาด (วงจรเปิด)' : fan.on ? 'วงจรปิด (กระแสไฟไหลครบวงจร)' : 'ปิดสวิตช์ (วงจรเปิด)'}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={fan.toggleOn} className="btn-secondary-3d btn-compact-3d">
                      {fan.on ? 'ปิดสวิตช์' : 'เปิดสวิตช์'}
                    </button>
                    <button
                      type="button"
                      onClick={fan.toggleCut}
                      className={fan.cut ? 'btn-secondary-3d btn-compact-3d' : 'btn-danger-3d btn-compact-3d'}
                    >
                      <Scissors className="w-4 h-4" />
                      {fan.cut ? 'ต่อสายไฟกลับ' : 'ทดลองตัดสายไฟ'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ห้อง C: อิเล็กทรอนิกส์ LDR + LED */}
      {activeTab === 2 && (
        <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4 animate-fade-up">
          <h3 className="font-heading font-bold text-lg">ห้อง C : แผงวงจรจำลอง LDR, ตัวต้านทาน, ตัวเก็บประจุ และ LED</h3>
          <div className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-heading font-bold">
                ปรับความสว่างของแสงห้องที่ตกกระทบ LDR: <span className="text-[var(--color-primary)]">{ambientLight}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={ambientLight}
                onChange={e => setAmbientLight(Number(e.target.value))}
                className="w-full accent-[var(--color-primary)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div className="text-xs text-[var(--text-muted)]">ความต้านทานของ LDR</div>
                <div className="font-mono font-extrabold text-lg text-[var(--color-primary)]">
                  {ldrResistance.toLocaleString()} Ω
                </div>
                <div className="text-xs text-[var(--text-secondary)]">ตามหนังสือ: แสงมาก ความต้านทานต่ำ</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col items-center justify-center">
                <div
                  className="w-12 h-12 rounded-full border-2 border-[#D99B00] transition-all"
                  style={{
                    backgroundColor: `rgba(242, 179, 27, ${ledBrightness / 100})`,
                    boxShadow: `0 0 ${Math.round(ledBrightness / 3)}px rgba(242, 179, 27, 0.9)`
                  }}
                />
                <div className="text-xs font-heading font-bold mt-1.5">หลอด LED ({ledBrightness}%)</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-left text-xs space-y-1">
                <div className="font-heading font-bold text-[var(--color-primary)]">บอร์ดไมโครคอนโทรลเลอร์ (สสวท.)</div>
                <div>• <strong>IPST-Link</strong> เขียนโปรแกรมด้วย Scratch</div>
                <div>• <strong>IPST MicroBOX</strong> เขียนด้วย Arduino C/C++</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* โมเดลรอง: ไม้เท้าอัจฉริยะสำหรับผู้บกพร่องทางการเห็น */}
      {activeTab === 3 && (
        <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading font-bold text-lg flex items-center gap-2">
              <Radio className="w-5 h-5 text-[var(--color-primary)]" />
              โมเดลรอง : ไม้เท้าอัจฉริยะ (อัลตราโซนิกเซนเซอร์)
            </h3>
            <button
              type="button"
              onClick={() => setSoundEnabled(v => !v)}
              className="btn-secondary-3d btn-compact-3d"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {soundEnabled ? 'ปิดเสียงเตือน' : 'เปิดเสียงเตือนจำลอง'}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-heading font-bold">
                ลากสิ่งกีดขวางเข้าใกล้ไม้เท้า: <span className="text-[var(--color-primary)]">{obstacleCm} เซนติเมตร</span>
              </label>
              <input
                type="range"
                min={10}
                max={200}
                value={obstacleCm}
                onChange={e => {
                  const val = Number(e.target.value);
                  setObstacleCm(val);
                  playUltrasonicBeep(val);
                }}
                className="w-full accent-[var(--color-primary)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div className="text-xs text-[var(--text-muted)]">เวลาคลื่นเสียงสะท้อนไป-กลับ</div>
                <div className="font-mono font-bold text-base text-[var(--color-primary)]">{echoTimeUs.toLocaleString()} µs</div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div className="text-xs text-[var(--text-muted)]">ระยะคำนวณ (v·t / 2)</div>
                <div className="font-mono font-bold text-base">{obstacleCm} ซม.</div>
              </div>
              <div
                className={`p-3 rounded-xl border-2 font-heading font-bold ${
                  obstacleCm <= 30
                    ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger)] text-[var(--color-danger)] animate-pulse'
                    : obstacleCm <= 80
                      ? 'bg-[var(--color-gold-bg)] border-[var(--color-gold-border)] text-[var(--color-gold)]'
                      : 'bg-[var(--color-success-bg)] border-[var(--color-success-border)] text-[var(--color-success)]'
                }`}
              >
                {alertLevel}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
