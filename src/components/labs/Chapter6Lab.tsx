'use client';

import { useState } from 'react';
import { Compass, RotateCcw, CheckCircle2, ArrowUpDown, Plus, CornerUpLeft } from 'lucide-react';

interface Chapter6LabProps {
  currentStepIdx: number;
  onSelectStep: (idx: number) => void;
}

const STEP_LABELS = [
  '6.1 ระบุปัญหา',
  '6.2 รวบรวมข้อมูลฯ',
  '6.3 ออกแบบวิธีแก้',
  '6.4 วางแผนดำเนินการ',
  '6.5 ทดสอบ & ปรับปรุง',
  '6.6 นำเสนอผลงาน'
];

const FISHBONE_CAUSES = [
  { id: 'c1', text: 'การได้ยินลดลงตามวัย', cat: 'ผู้สูงอายุ' },
  { id: 'c2', text: 'เสียงกริ่งประตูเบาหรือความถี่สูงเกินไป', cat: 'อุปกรณ์' },
  { id: 'c3', text: 'เสียงรบกวนจากทีวีหรือถนนภายนอก', cat: 'ปัจจัยสิ่งแวดล้อม' },
  { id: 'c4', text: 'วางโทรศัพท์ไว้คนละห้องกับที่นั่งพักผ่อน', cat: 'ปัจจัยสิ่งแวดล้อม' }
];

const CONCEPT_CHOICES = [
  {
    id: 'light_vibe',
    title: 'แนวคิดที่ 1 : อุปกรณ์รับเสียงแปลงเป็นไฟกะพริบ + สั่นเตือนที่ข้อมือ',
    parts: ['ไมโครโฟน/เซนเซอร์เสียง', 'บอร์ดไมโครคอนโทรลเลอร์', 'ไฟ LED สว่างชัด', 'มอเตอร์สั่น']
  },
  {
    id: 'visual_panel',
    title: 'แนวคิดที่ 2 : จอไฟสัญลักษณ์ตั้งโต๊ะกลางห้องนั่งเล่น',
    parts: ['เซนเซอร์เสียงกริ่ง/โทรศัพท์', 'ไมโครคอนโทรลเลอร์', 'แผงไฟสัญลักษณ์ขนาดใหญ่', 'โครงกล่องไม้อัด/พลาสติก']
  },
  {
    id: 'mobile_alert',
    title: 'แนวคิดที่ 3 : ระบบส่งการแจ้งเตือนเข้าสมาร์ตโฟนพร้อมแฟลชกะพริบ',
    parts: ['เซนเซอร์ตรวจจับเสียง', 'โมดูล Wi-Fi/บลูทูธ', 'แอปแจ้งเตือนสั่นและแฟลช']
  }
];

export function Chapter6Lab({ currentStepIdx, onSelectStep }: Chapter6LabProps) {
  const step = currentStepIdx % 6;

  // 6.1 5W1H + Fishbone
  const [w5h1, setW5h1] = useState({
    who: 'ผู้สูงอายุที่สูญเสียการได้ยิน',
    what: 'ไม่ได้ยินเสียงกริ่งประตู ทีวี หรือโทรศัพท์',
    where: 'ภายในห้องนั่งเล่นของบ้าน',
    when: 'ช่วงเวลาที่อยู่ลำพังหรือเปิดทีวี',
    why: 'การได้ยินลดลงตามวัยและมีเสียงรบกวน',
    how: 'ออกแบบอุปกรณ์ช่วยแจ้งเตือนด้วยแสงหรือการสั่น'
  });
  const [fishbonePlaced, setFishbonePlaced] = useState<Record<string, string>>({});

  // 6.2 Brainstorming
  const [ideaText, setIdeaText] = useState('');
  const [ideas, setIdeas] = useState<string[]>([
    'ติดไฟ LED กะพริบสีสว่างเมื่อมีคนกดกริ่งประตู',
    'สายรัดข้อมือสั่นเมื่อโทรศัพท์ดัง',
    'ขยายเสียงพูดและกรองเสียงรบกวนรอบข้าง'
  ]);

  // 6.3 Solution Design & Paper Prototype
  const [conceptId, setConceptId] = useState('light_vibe');
  const [pickedParts, setPickedParts] = useState<string[]>(['ไมโครโฟน/เซนเซอร์เสียง', 'ไฟ LED สว่างชัด']);

  // 6.4 Planning (linked to Ch4 & Ch5)
  const [planOwner, setPlanOwner] = useState('สมาชิกคนที่ 1');
  const [planMaterial, setPlanMaterial] = useState('กล่องพลาสติก/ไม้อัด (บทที่ 4) + เซนเซอร์เสียง & LED (บทที่ 5)');

  // 6.5 Testing & Loop-back to 6.3
  const [testTargetPass, setTestTargetPass] = useState(80);
  const [testMeasured, setTestMeasured] = useState(65);
  const [tested, setTested] = useState(false);

  // 6.6 3-Slide presentation order
  const [slidesOrder, setSlidesOrder] = useState<string[]>([
    'หน้า 3 : ผลการทดสอบและข้อเสนอแนะการปรับปรุง',
    'หน้า 1 : ปัญหาที่พบ (5W1H และแผนภาพก้างปลา)',
    'หน้า 2 : แนวคิดการออกแบบและต้นแบบชิ้นงาน'
  ]);
  const [slideChecked, setSlideChecked] = useState(false);

  const activeConcept = CONCEPT_CHOICES.find(c => c.id === conceptId) || CONCEPT_CHOICES[0];
  const slidesCorrect =
    slidesOrder[0].startsWith('หน้า 1') &&
    slidesOrder[1].startsWith('หน้า 2') &&
    slidesOrder[2].startsWith('หน้า 3');

  function swapSlide(i: number, j: number) {
    setSlidesOrder(prev => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setSlideChecked(false);
  }

  return (
    <div className="space-y-5">
      {/* วงล้อ 6 ขั้นตอน (กดข้ามหรือวนซ้ำได้ตามหนังสือรูป 6.3) */}
      <div className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-heading font-bold text-base text-[var(--color-primary)] flex items-center gap-2">
            <Compass className="w-5 h-5" />
            วงล้อกระบวนการออกแบบเชิงวิศวกรรม 6 ขั้นตอน (กรณีศึกษา: ผู้สูงอายุสูญเสียการได้ยิน)
          </div>
          <span className="text-xs text-[var(--text-secondary)]">สามารถกดวนซ้ำย้อนกลับได้ทุกขั้น</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {STEP_LABELS.map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => onSelectStep(idx)}
              className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-heading font-bold border-2 cursor-pointer transition ${
                step === idx
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                  : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 6.1 ระบุปัญหา: 5W1H + ก้างปลา */}
      {step === 0 && (
        <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4 animate-fade-up">
          <h3 className="font-heading font-bold text-lg">6.1 ขั้นระบุปัญหา : บอร์ด 5W1H และแผนภาพก้างปลา (Fishbone)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(
              [
                ['who', 'Who (ใคร)'],
                ['what', 'What (เกิดอะไรขึ้น)'],
                ['where', 'Where (ที่ไหน)'],
                ['when', 'When (เมื่อไร)'],
                ['why', 'Why (ทำไม)'],
                ['how', 'How (อย่างไร)']
              ] as const
            ).map(([k, lbl]) => (
              <div key={k}>
                <label className="block text-xs font-heading font-bold text-[var(--color-primary)] mb-1">{lbl}</label>
                <input
                  type="text"
                  value={w5h1[k]}
                  onChange={e => setW5h1(prev => ({ ...prev, [k]: e.target.value }))}
                  className="tus-input !min-h-[42px] text-sm"
                />
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
            <div className="font-heading font-bold text-sm">
              แผนภาพก้างปลา (เทียบกับรูป 6.5 ในหนังสือ) : เลือกหมวดสาเหตุให้ตรงกับแต่ละข้อ
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {FISHBONE_CAUSES.map(item => {
                const picked = fishbonePlaced[item.id];
                const ok = picked === item.cat;
                return (
                  <div key={item.id} className="p-3 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-2">
                    <div className="text-sm font-semibold">{item.text}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {['ผู้สูงอายุ', 'อุปกรณ์', 'ปัจจัยสิ่งแวดล้อม'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFishbonePlaced(prev => ({ ...prev, [item.id]: cat }))}
                          className={`min-h-[34px] px-2.5 rounded-lg text-xs font-heading font-bold border-2 cursor-pointer ${
                            picked === cat
                              ? ok
                                ? 'bg-[var(--color-success)] text-white border-[var(--color-success)]'
                                : 'bg-[var(--color-danger)] text-white border-[var(--color-danger)]'
                              : 'bg-[var(--bg-surface)] border-[var(--border-strong)]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 6.2 บอร์ดระดมสมอง */}
      {step === 1 && (
        <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4 animate-fade-up">
          <div>
            <h3 className="font-heading font-bold text-lg">6.2 ขั้นรวบรวมข้อมูลฯ : บอร์ดระดมสมอง (Brainstorming)</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              กติกาสำคัญของการระดมสมอง: เปิดรับทุกไอเดียให้ได้มากที่สุด <strong>ห้ามวิจารณ์หรือตัดสินระหว่างระดมสมอง</strong>
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={ideaText}
              onChange={e => setIdeaText(e.target.value)}
              placeholder="พิมพ์ไอเดียช่วยผู้สูงอายุรับรู้เสียงรอบข้าง..."
              className="tus-input"
            />
            <button
              type="button"
              onClick={() => {
                if (!ideaText.trim()) return;
                setIdeas(prev => [ideaText.trim(), ...prev]);
                setIdeaText('');
              }}
              className="btn-secondary-3d shrink-0"
            >
              <Plus className="w-4 h-4" /> โยนไอเดีย
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ideas.map((idea, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-[var(--color-primary-soft)] border border-[var(--color-primary-border)] text-sm font-medium">
                💡 {idea}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6.3 ออกแบบวิธีการแก้ปัญหา & ต้นแบบกระดาษ */}
      {step === 2 && (
        <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4 animate-fade-up">
          <h3 className="font-heading font-bold text-lg">6.3 ขั้นออกแบบ : เลือกแนวคิด 1 จาก 3 และประกอบต้นแบบ (Prototype)</h3>
          <div className="space-y-2">
            {CONCEPT_CHOICES.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setConceptId(c.id);
                  setPickedParts([c.parts[0]]);
                }}
                className={`w-full text-left p-3.5 rounded-xl border-2 text-sm font-heading font-bold cursor-pointer transition ${
                  conceptId === c.id
                    ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)]'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
          <div className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-2.5">
            <div className="text-sm font-heading font-bold">กดเลือกชิ้นส่วนวางลงบนต้นแบบกระดาษ:</div>
            <div className="flex flex-wrap gap-2">
              {activeConcept.parts.map(part => {
                const selected = pickedParts.includes(part);
                return (
                  <button
                    key={part}
                    type="button"
                    onClick={() =>
                      setPickedParts(prev => (prev.includes(part) ? prev.filter(p => p !== part) : [...prev, part]))
                    }
                    className={`min-h-[40px] px-3.5 rounded-xl text-sm font-heading font-bold border-2 cursor-pointer ${
                      selected
                        ? 'bg-[var(--color-success)] text-white border-[var(--color-success)]'
                        : 'bg-[var(--bg-surface)] border-[var(--border-strong)]'
                    }`}
                  >
                    {selected ? '✓ ' : '+ '}
                    {part}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              ชิ้นส่วนบนต้นแบบปัจจุบัน ({pickedParts.length}/{activeConcept.parts.length}): {pickedParts.join(' → ') || 'ยังไม่ได้เลือก'}
            </div>
          </div>
        </section>
      )}

      {/* 6.4 วางแผนและดำเนินการ (เชื่อมต่อบทที่ 4 & 5) */}
      {step === 3 && (
        <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4 animate-fade-up">
          <h3 className="font-heading font-bold text-lg">6.4 ขั้นวางแผนและดำเนินการ (เชื่อมต่อวัสดุ/เครื่องมือบทที่ 4 และเซนเซอร์บทที่ 5)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-heading font-bold mb-1">ผู้รับผิดชอบหลัก</label>
              <input type="text" value={planOwner} onChange={e => setPlanOwner(e.target.value)} className="tus-input" />
            </div>
            <div>
              <label className="block text-xs font-heading font-bold mb-1">วัสดุ เครื่องมือ และเซนเซอร์ที่ใช้ (บทที่ 4–5)</label>
              <input type="text" value={planMaterial} onChange={e => setPlanMaterial(e.target.value)} className="tus-input" />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-sm space-y-1.5">
            <div><strong>สัปดาห์ที่ 1:</strong> เตรียมวัสดุโครงสร้างและเครื่องมือตัด-เจาะอย่างปลอดภัย (บทที่ 4)</div>
            <div><strong>สัปดาห์ที่ 2:</strong> ต่อวงจรเซนเซอร์เสียง ไมโครคอนโทรลเลอร์ ไฟ LED และมอเตอร์สั่น (บทที่ 5)</div>
            <div><strong>ผู้รับผิดชอบ:</strong> {planOwner} • <strong>รายการอุปกรณ์:</strong> {planMaterial}</div>
          </div>
        </section>
      )}

      {/* 6.5 ทดสอบ ประเมินผล และปรับปรุง (มีลูกศรวนกลับไป 6.3 เมื่อไม่ผ่าน) */}
      {step === 4 && (
        <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4 animate-fade-up">
          <h3 className="font-heading font-bold text-lg">6.5 ขั้นทดสอบ ประเมินผล และปรับปรุงแก้ไข</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-heading font-bold mb-1">
                เกณฑ์ความแม่นยำการแจ้งเตือนที่ตั้งไว้: <span className="text-[var(--color-primary)]">{testTargetPass}%</span>
              </label>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={testTargetPass}
                onChange={e => {
                  setTestTargetPass(Number(e.target.value));
                  setTested(false);
                }}
                className="w-full accent-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-heading font-bold mb-1">
                ผลการทดสอบจริงจากต้นแบบ: <span className="text-[var(--color-primary)]">{testMeasured}%</span>
              </label>
              <input
                type="range"
                min={30}
                max={100}
                step={5}
                value={testMeasured}
                onChange={e => {
                  setTestMeasured(Number(e.target.value));
                  setTested(false);
                }}
                className="w-full accent-[var(--color-primary)]"
              />
            </div>
          </div>
          <button type="button" onClick={() => setTested(true)} className="btn-secondary-3d">
            <CheckCircle2 className="w-4 h-4" /> ประเมินผลการทดสอบ
          </button>

          {tested && (
            testMeasured >= testTargetPass ? (
              <div className="p-4 rounded-2xl bg-[var(--color-success-bg)] border-2 border-[var(--color-success)] text-sm sm:text-base font-bold text-[var(--color-success)]">
                ✓ ผ่านเกณฑ์การทดสอบ ({testMeasured}% ≥ {testTargetPass}%) — พร้อมเข้าสู่ขั้นที่ 6.6 นำเสนอผลงาน!
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[var(--color-danger-bg)] border-2 border-[var(--color-danger)] space-y-3 animate-scale-pop">
                <div className="font-heading font-bold text-[var(--color-danger)]">
                  ✗ ยังไม่ผ่านเกณฑ์ ({testMeasured}% &lt; {testTargetPass}%) — ต้องวนซ้ำย้อนกลับไปปรับปรุงการออกแบบ!
                </div>
                <button
                  type="button"
                  onClick={() => onSelectStep(2)}
                  className="btn-secondary-3d"
                >
                  <CornerUpLeft className="w-4 h-4" /> ย้อนกลับไปขั้นที่ 6.3 ปรับปรุงการออกแบบ
                </button>
              </div>
            )
          )}
        </section>
      )}

      {/* 6.6 นำเสนอผลงาน: เรียงลำดับสไลด์ 3 หน้า */}
      {step === 5 && (
        <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4 animate-fade-up">
          <h3 className="font-heading font-bold text-lg">6.6 ขั้นนำเสนอ : เรียงลำดับสไลด์นำเสนอ 3 หน้าให้ถูกต้อง</h3>
          <div className="space-y-2">
            {slidesOrder.map((slide, idx) => (
              <div
                key={slide}
                className="p-3.5 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] flex items-center justify-between gap-2"
              >
                <span className="font-heading font-bold text-sm sm:text-base">
                  ลำดับที่ {idx + 1} : {slide}
                </span>
                <div className="flex gap-1.5 shrink-0">
                  {idx > 0 && (
                    <button type="button" onClick={() => swapSlide(idx, idx - 1)} className="btn-secondary-3d btn-compact-3d !px-2.5">
                      <ArrowUpDown className="w-4 h-4" /> เลื่อนขึ้น
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setSlideChecked(true)} className="btn-secondary-3d">
              <CheckCircle2 className="w-4 h-4" /> ตรวจลำดับสไลด์นำเสนอ
            </button>
            <button
              type="button"
              onClick={() => {
                setSlidesOrder([
                  'หน้า 3 : ผลการทดสอบและข้อเสนอแนะการปรับปรุง',
                  'หน้า 1 : ปัญหาที่พบ (5W1H และแผนภาพก้างปลา)',
                  'หน้า 2 : แนวคิดการออกแบบและต้นแบบชิ้นงาน'
                ]);
                setSlideChecked(false);
              }}
              className="btn-secondary-3d"
            >
              <RotateCcw className="w-4 h-4" /> สุ่มใหม่
            </button>
            {slideChecked && (
              <span className={`font-heading font-bold text-sm ${slidesCorrect ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                {slidesCorrect
                  ? '✓ เรียงลำดับถูกต้อง (ปัญหา → วิธีแก้ → ผลทดสอบ)!'
                  : '✗ ลองเรียงลำดับใหม่ให้เริ่มจากปัญหา ตามด้วยวิธีแก้ และปิดท้ายด้วยผลทดสอบครับ'}
              </span>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
