'use client';

import { useState } from 'react';
import { Flame, Wind, Wrench, CheckCircle2, AlertTriangle, RotateCcw, ArrowRight } from 'lucide-react';

interface Chapter1LabProps {
  currentStepIdx: number;
  onSelectStep: (idx: number) => void;
}

const AC_SUBSYSTEMS = [
  {
    id: 'compressor',
    name: '1. ระบบอัดความดัน (Compressor)',
    input: 'พลังงานไฟฟ้า + สารทำความเย็นสถานะแก๊สความดันต่ำจากคอยล์เย็น',
    process: 'อัดสารทำความเย็นให้มีความดันและอุณหภูมิสูงขึ้นเพื่อส่งต่อในวงจร',
    output: 'สารทำความเย็นสถานะแก๊สความดันสูงและอุณหภูมิสูงส่งไปยังคอยล์ร้อน'
  },
  {
    id: 'condenser',
    name: '2. ระบบคอยล์ร้อน (Condenser)',
    input: 'สารทำความเย็นแก๊สความดันสูง อุณหภูมิสูง + อากาศภายนอก (พัดลมคอยล์ร้อน)',
    process: 'ระบายความร้อนออกจากสารทำความเย็นจนควบแน่นเปลี่ยนสถานะเป็นของเหลว',
    output: 'ลมร้อนที่ระบายออกนอกห้อง + สารทำความเย็นสถานะของเหลวความดันสูง'
  },
  {
    id: 'expansion',
    name: '3. ระบบลดความดัน (Expansion)',
    input: 'สารทำความเย็นสถานะของเหลวความดันสูงจากคอยล์ร้อน',
    process: 'ลดความดันและอุณหภูมิของสารทำความเย็นอย่างรวดเร็วก่อนเข้าสู่คอยล์เย็น',
    output: 'สารทำความเย็นความดันต่ำ อุณหภูมิต่ำ พร้อมดูดซับความร้อนในห้อง'
  },
  {
    id: 'evaporator',
    name: '4. ระบบคอยล์เย็น (Evaporator)',
    input: 'สารทำความเย็นอุณหภูมิต่ำ + อากาศอุ่นภายในห้องที่ผ่านแผ่นกรองอากาศ',
    process: 'สารทำความเย็นดูดซับความร้อนจากอากาศในห้องแล้วระเหยเป็นแก๊ส พัดลมเป่าลมเย็นออกสู่ห้อง',
    output: 'อากาศเย็นภายในห้อง + สารทำความเย็นสถานะแก๊สความดันต่ำส่งกลับคอมเพรสเซอร์'
  }
];

const AC_FAULTS = [
  {
    id: 'filter',
    label: 'แผ่นกรองอากาศอุดตัน',
    affected: 'ระบบคอยล์เย็น (Evaporator)',
    effect: 'อากาศไหลผ่านคอยล์เย็นได้ไม่ดี แอร์ไม่เย็น ลมเบา และอาจเกิดน้ำแข็งเกาะที่แผงคอยล์เย็น',
    fix: 'ผู้ใช้งานสามารถถอดแผ่นกรองอากาศออกมาล้างทำความสะอาดและผึ่งให้แห้งได้ด้วยตนเองอย่างสม่ำเสมอ',
    diy: true
  },
  {
    id: 'compressor',
    label: 'คอมเพรสเซอร์ไม่ทำงาน',
    affected: 'ระบบอัดความดัน (Compressor)',
    effect: 'ไม่สามารถอัดและหมุนเวียนสารทำความเย็นในระบบได้ เครื่องปรับอากาศจะเป่าออกแต่ลมธรรมดาไม่เย็น',
    fix: 'ต้องปิดเบรกเกอร์และติดต่อช่างผู้เชี่ยวชาญตรวจสอบระบบไฟฟ้า ตัวเก็บประจุ หรือเปลี่ยนคอมเพรสเซอร์',
    diy: false
  },
  {
    id: 'expansion',
    label: 'ระบบลดความดันอุดตัน / สารทำความเย็นรั่ว',
    affected: 'ระบบลดความดัน (Expansion)',
    effect: 'สารทำความเย็นไหลผ่านไม่สะดวกหรือไม่เพียงพอ ความเย็นลดลงมากและคอมเพรสเซอร์ทำงานหนักผิดปกติ',
    fix: 'ห้ามซ่อมเอง ต้องให้ช่างผู้เชี่ยวชาญตรวจสอบจุดรั่ว ล้างระบบ และเติมสารทำความเย็นให้ถูกต้อง',
    diy: false
  },
  {
    id: 'fan',
    label: 'พัดลมคอยล์ร้อนเสีย',
    affected: 'ระบบคอยล์ร้อน (Condenser)',
    effect: 'ไม่สามารถระบายความร้อนออกสู่ภายนอกได้ ทำให้ความดันและอุณหภูมิในระบบสูงจัดจนเครื่องตัดการทำงาน',
    fix: 'ปิดเครื่องปรับอากาศทันทีเพื่อป้องกันคอมเพรสเซอร์เสียหาย และให้ช่างตรวจเช็กมอเตอร์พัดลมคอยล์ร้อน',
    diy: false
  }
];

type IpofSlot = 'input' | 'process' | 'output' | 'feedback';

const IPOF_SYSTEMS: Record<
  'fridge' | 'moto',
  {
    name: string;
    items: { id: string; text: string; target: IpofSlot }[];
  }
> = {
  fridge: {
    name: 'ตู้เย็น',
    items: [
      { id: 'f1', text: 'พลังงานไฟฟ้า + ความร้อนจากอาหารภายในตู้', target: 'input' },
      { id: 'f2', text: 'ระบบทำความเย็นดูดความร้อนจากภายในไประบายออกด้านหลังตู้', target: 'process' },
      { id: 'f3', text: 'ความเย็นภายในตู้ช่วยถนอมอาหารให้สดใหม่', target: 'output' },
      { id: 'f4', text: 'เทอร์โมสตัตวัดอุณหภูมิแล้วสั่งตัด-ต่อคอมเพรสเซอร์อัตโนมัติ', target: 'feedback' }
    ]
  },
  moto: {
    name: 'รถจักรยานยนต์',
    items: [
      { id: 'm1', text: 'น้ำมันเชื้อเพลิง อากาศ แรงบิดคันเร่ง และพลังงานไฟฟ้าจากแบตเตอรี่', target: 'input' },
      { id: 'm2', text: 'เครื่องยนต์เผาไหม้เชื้อเพลิงส่งกำลังผ่านชุดเกียร์และโซ่ไปยังล้อหลัง', target: 'process' },
      { id: 'm3', text: 'การเคลื่อนที่ของรถจักรยานยนต์ไปข้างหน้าตามความเร็วที่ต้องการ', target: 'output' },
      { id: 'm4', text: 'มาตรวัดความเร็ว/ระดับน้ำมัน แจ้งให้ผู้ขับขี่ปรับคันเร่งหรือเบรก', target: 'feedback' }
    ]
  }
};

const SLOT_META: { id: IpofSlot; label: string }[] = [
  { id: 'input', label: 'ตัวป้อน (Input)' },
  { id: 'process', label: 'กระบวนการ (Process)' },
  { id: 'output', label: 'ผลผลิต (Output)' },
  { id: 'feedback', label: 'ข้อมูลย้อนกลับ (Feedback)' }
];

export function Chapter1Lab({ currentStepIdx, onSelectStep }: Chapter1LabProps) {
  const [selectedAcId, setSelectedAcId] = useState('compressor');
  const [faultId, setFaultId] = useState<string | null>(null);

  // I-P-O-F activity state
  const [ipofSystem, setIpofSystem] = useState<'fridge' | 'moto'>('fridge');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Partial<Record<IpofSlot, string>>>({});
  const [checkedIpof, setCheckedIpof] = useState(false);

  const activeAc = AC_SUBSYSTEMS.find(s => s.id === selectedAcId) || AC_SUBSYSTEMS[0];
  const activeFault = AC_FAULTS.find(f => f.id === faultId) || null;
  const activeSystem = IPOF_SYSTEMS[ipofSystem];

  // Rice cooker live physical state derived from step (0..5)
  const switchClosed = currentStepIdx <= 4;
  const magnetAttached = currentStepIdx <= 3;
  const springCompressed = currentStepIdx <= 4;
  const waterLevel = [100, 95, 70, 15, 0, 0][currentStepIdx] ?? 100;
  const tempLabel = ['28 °C', '65 °C', '100 °C (เดือด)', '108 °C (น้ำแห้ง)', '135 °C (เกินจุดวิกฤต)', 'ตัดไฟอัตโนมัติ'][currentStepIdx];

  function handlePlaceInSlot(slot: IpofSlot) {
    if (!selectedCardId) return;
    setPlacements(prev => {
      const next: Partial<Record<IpofSlot, string>> = { ...prev };
      // Remove card from any previous slot
      (Object.keys(next) as IpofSlot[]).forEach(k => {
        if (next[k] === selectedCardId) delete next[k];
      });
      next[slot] = selectedCardId;
      return next;
    });
    setSelectedCardId(null);
    setCheckedIpof(false);
  }

  const placedIds = new Set(Object.values(placements));
  const correctIpofCount = SLOT_META.filter(slot => {
    const item = activeSystem.items.find(i => i.id === placements[slot.id]);
    return item?.target === slot.id;
  }).length;

  return (
    <div className="space-y-6">
      {/* 1. แผงจำลองกลไกหม้อหุงข้าว 6 ขั้นตอน + แผนภาพ I-P-O-F */}
      <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-heading font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
            <Flame className="w-5 h-5 text-[var(--color-primary)]" />
            จำลองกลไกภายในหม้อหุงข้าวไฟฟ้า (ตามรูป 1.8–1.10)
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {[0, 1, 2, 3, 4, 5].map(idx => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectStep(idx)}
                className={`min-h-[38px] px-3 rounded-xl text-xs font-heading font-bold border-2 cursor-pointer transition ${
                  currentStepIdx === idx
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--bg-surface-muted)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]'
                }`}
              >
                ขั้น {idx + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-sm">
          <div className="p-3 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)]">
            <div className="text-xs text-[var(--text-muted)]">จุดสัมผัสสวิตช์</div>
            <div className={`font-heading font-bold mt-0.5 ${switchClosed ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
              {switchClosed ? 'ต่อกัน (ไฟไหล)' : 'แยกกัน (ตัดไฟ)'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)]">
            <div className="text-xs text-[var(--text-muted)]">แม่เหล็กเฟอร์โร</div>
            <div className={`font-heading font-bold mt-0.5 ${magnetAttached ? 'text-[var(--color-primary)]' : 'text-[var(--color-gold)]'}`}>
              {magnetAttached ? 'ดูดติดแม่เหล็กถาวร' : 'สูญเสียแรงดูด'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)]">
            <div className="text-xs text-[var(--text-muted)]">ขดลวดสปริง</div>
            <div className="font-heading font-bold mt-0.5 text-[var(--text-primary)]">
              {springCompressed ? 'ถูกอัดหดตัว' : 'ดันแกนสวิตช์ลง'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)]">
            <div className="text-xs text-[var(--text-muted)]">ระดับน้ำในหม้อ</div>
            <div className="font-heading font-bold mt-0.5 text-[var(--text-primary)]">{waterLevel}%</div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] col-span-2 sm:col-span-1">
            <div className="text-xs text-[var(--text-muted)]">อุณหภูมิก้นหม้อ</div>
            <div className="font-heading font-bold mt-0.5 text-[var(--color-primary)]">{tempLabel}</div>
          </div>
        </div>

        {/* แผนภาพสรุป I-P-O-F หม้อหุงข้าวตามหนังสือ */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-3 rounded-xl bg-[var(--color-primary-soft)] border border-[var(--color-primary-border)]">
            <div className="text-xs font-heading font-bold text-[var(--color-primary)]">ตัวป้อน (Input)</div>
            <p className="text-sm mt-1">พลังงานไฟฟ้า ข้าว น้ำ</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)]">
            <div className="text-xs font-heading font-bold text-[var(--color-primary)]">กระบวนการ (Process)</div>
            <p className="text-sm mt-1">เปลี่ยนพลังงานไฟฟ้าเป็นความร้อนทำให้น้ำเดือด</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success-border)]">
            <div className="text-xs font-heading font-bold text-[var(--color-success)]">ผลผลิต (Output)</div>
            <p className="text-sm mt-1">ข้าวที่หุงสุก</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--color-gold-bg)] border border-[var(--color-gold-border)]">
            <div className="text-xs font-heading font-bold text-[var(--color-gold)]">ข้อมูลย้อนกลับ (Feedback)</div>
            <p className="text-sm mt-1">ส่งข้อมูลให้ระบบตัดไฟทำงานเมื่อน้ำแห้ง</p>
          </div>
        </div>
      </section>

      {/* 2. โมเดลรอง: เครื่องปรับอากาศ (4 ระบบย่อยตามรูป 1.13 + โหมดจำลองความผิดพลาด) */}
      <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-heading font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
            <Wind className="w-5 h-5 text-[var(--color-primary)]" />
            โมเดลรอง : วงจรเครื่องปรับอากาศ 4 ระบบย่อย (ตามรูป 1.13)
          </h3>
          {faultId && (
            <button
              type="button"
              onClick={() => setFaultId(null)}
              className="btn-secondary-3d btn-compact-3d"
            >
              <RotateCcw className="w-4 h-4" /> รีเซ็ตเป็นสถานะปกติ
            </button>
          )}
        </div>

        {/* วงจร 4 ระบบย่อย */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {AC_SUBSYSTEMS.map(sub => {
            const isSel = selectedAcId === sub.id;
            const isFaulty =
              (faultId === 'filter' && sub.id === 'evaporator') ||
              (faultId === 'compressor' && sub.id === 'compressor') ||
              (faultId === 'expansion' && sub.id === 'expansion') ||
              (faultId === 'fan' && sub.id === 'condenser');

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedAcId(sub.id)}
                className={`p-3.5 rounded-2xl text-left border-2 cursor-pointer transition ${
                  isFaulty
                    ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger)] text-[var(--text-primary)]'
                    : isSel
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]'
                }`}
              >
                <div className="font-heading font-bold text-sm flex items-center justify-between gap-1">
                  <span>{sub.name}</span>
                  <ArrowRight className="w-4 h-4 shrink-0 opacity-75" />
                </div>
                {isFaulty && (
                  <div className="text-xs font-bold text-[var(--color-danger)] mt-1">
                    พบความผิดพลาดที่ระบบนี้!
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* รายละเอียด I-P-O ของระบบย่อยที่เลือก */}
        <div className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-2 text-sm sm:text-base">
          <div className="font-heading font-bold text-[var(--color-primary)]">{activeAc.name}</div>
          <p><strong>ตัวป้อน (Input):</strong> {activeAc.input}</p>
          <p><strong>กระบวนการ (Process):</strong> {activeAc.process}</p>
          <p><strong>ผลผลิต (Output):</strong> {activeAc.output}</p>
        </div>

        {/* โหมดจำลองความผิดพลาด */}
        <div className="space-y-2.5 pt-2 border-t border-[var(--border-subtle)]">
          <div className="font-heading font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[var(--color-danger)]" />
            โหมด “จำลองความผิดพลาด” (กดเลือกชิ้นส่วนที่เสียเพื่อดูผลกระทบและวิธีซ่อมบำรุง)
          </div>
          <div className="flex flex-wrap gap-2">
            {AC_FAULTS.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFaultId(prev => (prev === f.id ? null : f.id))}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-heading font-bold border-2 cursor-pointer transition ${
                  faultId === f.id
                    ? 'bg-[var(--color-danger)] text-white border-[var(--color-danger)]'
                    : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-strong)] hover:border-[var(--color-danger)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {activeFault && (
            <div className="p-4 rounded-2xl bg-[var(--color-danger-bg)] border-2 border-[var(--color-danger)] space-y-2 text-sm sm:text-base animate-scale-pop">
              <div className="font-heading font-bold text-[var(--color-danger)] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                อาการเสีย: {activeFault.label} (กระทบ: {activeFault.affected})
              </div>
              <p><strong>ผลกระทบที่เกิดขึ้น:</strong> {activeFault.effect}</p>
              <p>
                <strong>แนวทางแก้ไข ({activeFault.diy ? 'ทำเองได้' : 'ควรเรียกช่างผู้เชี่ยวชาญ'}):</strong>{' '}
                {activeFault.fix}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 3. กิจกรรมจัดวางกล่อง I-P-O-F ของระบบอื่น (ตู้เย็น หรือ รถจักรยานยนต์) */}
      <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-heading font-bold text-lg text-[var(--text-primary)]">
              กิจกรรมฝึกวิเคราะห์ I-P-O-F : เลือกข้อความวางลงกล่องให้ถูกต้อง
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              แตะเลือกข้อความด้านล่าง แล้วแตะกล่อง I-P-O-F ที่ต้องการวาง (รองรับทั้งมือถือและคอมพิวเตอร์)
            </p>
          </div>
          <div className="flex gap-2">
            {(['fridge', 'moto'] as const).map(sys => (
              <button
                key={sys}
                type="button"
                onClick={() => {
                  setIpofSystem(sys);
                  setPlacements({});
                  setSelectedCardId(null);
                  setCheckedIpof(false);
                }}
                className={`min-h-[42px] px-3.5 rounded-xl text-sm font-heading font-bold border-2 cursor-pointer transition ${
                  ipofSystem === sys
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--bg-surface-muted)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                }`}
              >
                {IPOF_SYSTEMS[sys].name}
              </button>
            ))}
          </div>
        </div>

        {/* ข้อความที่ยังไม่ถูกวาง */}
        <div className="flex flex-wrap gap-2">
          {activeSystem.items
            .filter(item => !placedIds.has(item.id))
            .map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedCardId(prev => (prev === item.id ? null : item.id))}
                className={`px-3.5 py-2.5 rounded-xl text-sm text-left font-medium border-2 cursor-pointer transition ${
                  selectedCardId === item.id
                    ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)] text-[var(--color-primary)] font-bold'
                    : 'bg-[var(--bg-surface-muted)] border-[var(--border-strong)] hover:border-[var(--color-primary)]'
                }`}
              >
                {item.text}
              </button>
            ))}
          {placedIds.size === activeSystem.items.length && (
            <span className="text-sm text-[var(--color-success)] font-heading font-bold">
              วางครบทั้ง 4 กล่องแล้ว กดปุ่ม “ตรวจคำตอบ” ด้านล่างได้เลย!
            </span>
          )}
        </div>

        {/* 4 กล่อง I-P-O-F */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SLOT_META.map(slot => {
            const placedItem = activeSystem.items.find(i => i.id === placements[slot.id]);
            const isCorrect = checkedIpof && placedItem?.target === slot.id;
            const isWrong = checkedIpof && placedItem && placedItem.target !== slot.id;

            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => {
                  if (selectedCardId) {
                    handlePlaceInSlot(slot.id);
                  } else if (placedItem) {
                    setPlacements(prev => {
                      const next = { ...prev };
                      delete next[slot.id];
                      return next;
                    });
                    setCheckedIpof(false);
                  }
                }}
                className={`min-h-[116px] p-3.5 rounded-2xl border-2 border-dashed text-left flex flex-col justify-between gap-2 cursor-pointer transition ${
                  isCorrect
                    ? 'bg-[var(--color-success-bg)] border-[var(--color-success)] border-solid'
                    : isWrong
                      ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger)] border-solid'
                      : selectedCardId
                        ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)]'
                        : 'bg-[var(--bg-surface-muted)] border-[var(--border-strong)]'
                }`}
              >
                <div className="text-xs font-heading font-bold text-[var(--color-primary)]">{slot.label}</div>
                <div className="text-sm text-[var(--text-primary)]">
                  {placedItem ? (
                    placedItem.text
                  ) : (
                    <span className="text-[var(--text-muted)]">
                      {selectedCardId ? 'แตะที่นี่เพื่อวางข้อความ' : 'ยังว่าง (เลือกข้อความด้านบนก่อน)'}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={placedIds.size < 4}
            onClick={() => setCheckedIpof(true)}
            className="btn-secondary-3d"
          >
            <CheckCircle2 className="w-4 h-4" /> ตรวจคำตอบ I-P-O-F
          </button>
          <button
            type="button"
            onClick={() => {
              setPlacements({});
              setSelectedCardId(null);
              setCheckedIpof(false);
            }}
            className="btn-secondary-3d"
          >
            <RotateCcw className="w-4 h-4" /> เริ่มใหม่
          </button>
          {checkedIpof && (
            <span
              className={`font-heading font-bold text-sm ${
                correctIpofCount === 4 ? 'text-[var(--color-success)]' : 'text-[var(--color-primary)]'
              }`}
            >
              {correctIpofCount === 4
                ? `ยอดเยี่ยม! ถูกต้องครบ 4/4 สำหรับระบบ${activeSystem.name}`
                : `ถูกต้อง ${correctIpofCount}/4 กล่อง — แตะกล่องสีแดงเพื่อย้ายข้อความลองใหม่อีกครั้งนะครับ`}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
