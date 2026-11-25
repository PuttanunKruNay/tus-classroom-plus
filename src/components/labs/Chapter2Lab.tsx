'use client';

import { useState } from 'react';
import { History, Layers, CheckCircle2, RotateCcw, ClipboardList } from 'lucide-react';

interface Chapter2LabProps {
  currentStepIdx: number;
  onSelectStep: (idx: number) => void;
}

const STETHOSCOPE_ERAS = [
  {
    era: 'ยุคที่ 1 : หูฟังแพทย์ไม้',
    limitation: 'ขนาดใหญ่ หนัก พกพาลำบาก และฟังได้เพียงข้างเดียว',
    driver: 'ความต้องการของมนุษย์ให้แพทย์ตรวจฟังเสียงหัวใจ-ปอดได้สะดวกและชัดเจนขึ้น',
    result: 'ช่วยให้แพทย์ไม่ต้องแนบหูกับหน้าอกผู้ป่วยโดยตรง แต่ยังพกพาไม่สะดวก'
  },
  {
    era: 'ยุคที่ 2 : หูฟังขนาดเล็ก น้ำหนักเบา',
    limitation: 'ยังไม่สามารถบันทึกคลื่นเสียงเก็บไว้เปรียบเทียบหรือตัดเสียงรบกวนรอบข้างได้ดีนัก',
    driver: 'ความก้าวหน้าด้านวัสดุศาสตร์และความรู้เรื่องคลื่นเสียง',
    result: 'ขนาดกะทัดรัด น้ำหนักเบา พกพาง่าย รับเสียงได้ชัดเจนทั้งสองหู'
  },
  {
    era: 'ยุคที่ 3 : หูฟังอิเล็กทรอนิกส์เชื่อมคอมพิวเตอร์ผ่านบลูทูธ',
    limitation: 'ต้องใช้พลังงานแบตเตอรี่และมีต้นทุนสูงกว่าแบบดั้งเดิม',
    driver: 'ความก้าวหน้าด้านอิเล็กทรอนิกส์ ซอฟต์แวร์ และการสื่อสารไร้สาย',
    result: 'บันทึกเสียง แสดงสัญญาณภาพได้ และตัดเสียงรบกวนภายนอกได้ดีขึ้น'
  }
];

const EXTRA_EXAMPLES = [
  {
    id: 'stetho',
    label: 'หูฟังแพทย์ 3 ยุค',
    beforeTitle: 'หูฟังไม้ (ยุคแรก)',
    beforeNote: 'ใหญ่ หนัก พกพาลำบาก',
    afterTitle: 'หูฟังอิเล็กทรอนิกส์บลูทูธ',
    afterNote: 'บันทึกเสียง แสดงสัญญาณภาพ และตัดเสียงรบกวนได้ดีขึ้น',
    factor: 'ความก้าวหน้าทางวิทยาศาสตร์ (วัสดุศาสตร์ & คลื่นเสียง) + ความต้องการของมนุษย์'
  },
  {
    id: 'cpap',
    label: 'CPAP → หมอนตุ๊กตาช่วยนอน',
    beforeTitle: 'เครื่องอัดอากาศแรงดันบวก (CPAP)',
    beforeNote: 'ข้อจำกัด: หน้ากากไม่พอดีกับใบหน้า รู้สึกอึดอัด และอาจเกิดอาการคัดจมูก',
    afterTitle: 'หมอนตุ๊กตาช่วยลดปัญหาการนอน',
    afterNote: 'แนวคิดต้นแบบที่ช่วยให้ผู้มีภาวะหยุดหายใจขณะหลับปรับท่านอนได้สบายขึ้น (ยังเป็นต้นแบบ ต้องวิจัยพัฒนาต่อ)',
    factor: 'ปัญหาและความต้องการของผู้ใช้งานจริง'
  },
  {
    id: 'foam',
    label: 'โฟมใส่อาหาร → ภาชนะใบไม้',
    beforeTitle: 'กล่องโฟมใส่อาหาร',
    beforeNote: 'ผลิตจากสารสไตรีนที่เป็นอันตรายต่อสุขภาพและย่อยสลายทางธรรมชาติได้ยากมาก',
    afterTitle: 'ภาชนะจากใบทองกวาว ใบไทร และใบสัก',
    afterNote: 'ปลอดภัยต่อผู้บริโภค ย่อยสลายได้เองตามธรรมชาติ และสร้างมูลค่าเพิ่มจากทรัพยากรท้องถิ่น',
    factor: 'สิ่งแวดล้อม วัฒนธรรม และทรัพยากรที่มีในขณะนั้น'
  }
];

const SORT_CARDS: { id: string; name: string; type: 'sustaining' | 'disruptive' }[] = [
  { id: 'c1', name: 'โต๊ะและเก้าอี้', type: 'sustaining' },
  { id: 'c2', name: 'หม้อหุงข้าวไฟฟ้า', type: 'sustaining' },
  { id: 'c3', name: 'เครื่องปรับอากาศ', type: 'sustaining' },
  { id: 'c4', name: 'Internet of Things (IoT)', type: 'disruptive' },
  { id: 'c5', name: 'Cloud Computing', type: 'disruptive' },
  { id: 'c6', name: 'หุ่นยนต์และยานพาหนะไร้คนขับ', type: 'disruptive' },
  { id: 'c7', name: 'เทคโนโลยีชีวภาพและการพิมพ์สามมิติ', type: 'disruptive' }
];

const CHANGE_FACTORS = [
  'ความก้าวหน้าทางวิทยาศาสตร์และคณิตศาสตร์',
  'ปัญหาหรือความต้องการของมนุษย์',
  'ปัจจัยด้านเศรษฐกิจ',
  'ปัจจัยด้านสังคม',
  'วัฒนธรรม',
  'สิ่งแวดล้อม',
  'ทรัพยากรที่มีในขณะนั้น'
];

export function Chapter2Lab({ currentStepIdx, onSelectStep }: Chapter2LabProps) {
  const [exampleId, setExampleId] = useState('stetho');
  const [answers, setAnswers] = useState<Record<string, 'sustaining' | 'disruptive'>>({});
  const [checkedSort, setCheckedSort] = useState(false);

  // Activity 2.1 state
  const [techName, setTechName] = useState('โทรศัพท์มือถือ');
  const [pastToNow, setPastToNow] = useState('');
  const [pickedFactors, setPickedFactors] = useState<string[]>(['ความก้าวหน้าทางวิทยาศาสตร์และคณิตศาสตร์']);
  const [savedLog, setSavedLog] = useState<
    { tech: string; change: string; factors: string[] }[]
  >([]);

  const eraData = STETHOSCOPE_ERAS[currentStepIdx % STETHOSCOPE_ERAS.length];
  const activeEx = EXTRA_EXAMPLES.find(e => e.id === exampleId) || EXTRA_EXAMPLES[0];

  const correctSortCount = SORT_CARDS.filter(c => answers[c.id] === c.type).length;

  function toggleFactor(f: string) {
    setPickedFactors(prev => (prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]));
  }

  return (
    <div className="space-y-6">
      {/* 1. แถบเวลาหูฟังแพทย์ 3 ยุค + ตัวอย่างเสริมสลับทีละโมเดล */}
      <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-heading font-bold text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-[var(--color-primary)]" />
            แถบเวลา 3 ยุค (หูฟังแพทย์) & ตัวอย่างการเปลี่ยนแปลงตามหนังสือ
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {EXTRA_EXAMPLES.map(ex => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setExampleId(ex.id)}
                className={`min-h-[40px] px-3 rounded-xl text-xs sm:text-sm font-heading font-bold border-2 cursor-pointer transition ${
                  exampleId === ex.id
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]'
                }`}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {exampleId === 'stetho' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {STETHOSCOPE_ERAS.map((item, idx) => (
                <button
                  key={item.era}
                  type="button"
                  onClick={() => onSelectStep(idx)}
                  className={`p-3 rounded-xl text-left border-2 cursor-pointer transition ${
                    currentStepIdx % 3 === idx
                      ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)] text-[var(--color-primary)] font-bold'
                      : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)]'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-heading font-bold">{item.era}</div>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm sm:text-base">
              <div className="p-3.5 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30">
                <div className="text-xs font-heading font-bold text-[var(--color-danger)]">ข้อจำกัดของยุคนั้น</div>
                <p className="mt-1">{eraData.limitation}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--color-gold-bg)] border border-[var(--color-gold-border)]">
                <div className="text-xs font-heading font-bold text-[var(--color-gold)]">สิ่งที่ผลักดันให้เปลี่ยน</div>
                <p className="mt-1">{eraData.driver}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success-border)]">
                <div className="text-xs font-heading font-bold text-[var(--color-success)]">ผลที่ได้</div>
                <p className="mt-1">{eraData.result}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm sm:text-base">
            <div className="p-4 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-1">
              <div className="text-xs font-heading font-bold text-[var(--color-danger)]">เดิม / ข้อจำกัด</div>
              <div className="font-heading font-bold">{activeEx.beforeTitle}</div>
              <p className="text-[var(--text-secondary)]">{activeEx.beforeNote}</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success-border)] space-y-1">
              <div className="text-xs font-heading font-bold text-[var(--color-success)]">เทคโนโลยีที่เปลี่ยนแปลงใหม่</div>
              <div className="font-heading font-bold">{activeEx.afterTitle}</div>
              <p>{activeEx.afterNote}</p>
              <div className="text-xs font-heading font-bold text-[var(--color-primary)] pt-1">
                ปัจจัยหลัก: {activeEx.factor}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 2. โหมด “เกิดอะไรกับเทคโนโลยีนี้” : Sustaining vs Disruptive */}
      <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div>
          <h3 className="font-heading font-bold text-lg flex items-center gap-2">
            <Layers className="w-5 h-5 text-[var(--color-primary)]" />
            โหมด “เกิดอะไรกับเทคโนโลยีนี้” : Sustaining vs Disruptive
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            อ้างอิงแนวคิด <em>The Innovator&apos;s Dilemma (1997)</em> ของ Clayton M. Christensen — กดจำแนกการ์ดแต่ละใบว่าเป็นแบบพัฒนาต่อยอดทีละเล็กน้อย (Sustaining) หรือเข้าแทนที่ของเดิม (Disruptive)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {SORT_CARDS.map(card => {
            const pick = answers[card.id];
            const ok = checkedSort && pick === card.type;
            const bad = checkedSort && pick && pick !== card.type;
            return (
              <div
                key={card.id}
                className={`p-3.5 rounded-2xl border-2 flex flex-wrap items-center justify-between gap-2 ${
                  ok
                    ? 'bg-[var(--color-success-bg)] border-[var(--color-success)]'
                    : bad
                      ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger)]'
                      : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)]'
                }`}
              >
                <span className="font-heading font-bold text-sm sm:text-base">{card.name}</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAnswers(prev => ({ ...prev, [card.id]: 'sustaining' }));
                      setCheckedSort(false);
                    }}
                    className={`min-h-[38px] px-3 rounded-xl text-xs font-heading font-bold border-2 cursor-pointer ${
                      pick === 'sustaining'
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-[var(--bg-surface)] border-[var(--border-strong)]'
                    }`}
                  >
                    Sustaining
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAnswers(prev => ({ ...prev, [card.id]: 'disruptive' }));
                      setCheckedSort(false);
                    }}
                    className={`min-h-[38px] px-3 rounded-xl text-xs font-heading font-bold border-2 cursor-pointer ${
                      pick === 'disruptive'
                        ? 'bg-[#F2B31B] text-neutral-950 border-[#D99B00]'
                        : 'bg-[var(--bg-surface)] border-[var(--border-strong)]'
                    }`}
                  >
                    Disruptive
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={Object.keys(answers).length < SORT_CARDS.length}
            onClick={() => setCheckedSort(true)}
            className="btn-secondary-3d"
          >
            <CheckCircle2 className="w-4 h-4" /> ตรวจการจำแนกการ์ด
          </button>
          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setCheckedSort(false);
            }}
            className="btn-secondary-3d"
          >
            <RotateCcw className="w-4 h-4" /> รีเซ็ต
          </button>
          {checkedSort && (
            <span className="font-heading font-bold text-sm text-[var(--color-primary)]">
              ถูกต้อง {correctSortCount}/{SORT_CARDS.length} รายการ
            </span>
          )}
        </div>
      </section>

      {/* 3. กิจกรรม 2.1 : วิเคราะห์เทคโนโลยีใกล้ตัว */}
      <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4">
        <h3 className="font-heading font-bold text-lg flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-[var(--color-primary)]" />
          กิจกรรม 2.1 : วิเคราะห์การเปลี่ยนแปลงของเทคโนโลยีใกล้ตัว
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-heading font-semibold mb-1">เทคโนโลยีใกล้ตัวที่เลือก</label>
            <input
              type="text"
              value={techName}
              onChange={e => setTechName(e.target.value)}
              placeholder="เช่น โทรศัพท์มือถือ, พัดลม, นาฬิกา"
              className="tus-input"
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold mb-1">ลักษณะที่เปลี่ยนจากอดีตถึงปัจจุบัน</label>
            <input
              type="text"
              value={pastToNow}
              onChange={e => setPastToNow(e.target.value)}
              placeholder="เช่น จากเครื่องใหญ่โทรได้อย่างเดียว → สมาร์ตโฟนจอสัมผัส"
              className="tus-input"
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-heading font-semibold">เลือกปัจจัยที่ทำให้เปลี่ยน (เลือกได้หลายข้อ)</div>
          <div className="flex flex-wrap gap-2">
            {CHANGE_FACTORS.map(f => {
              const active = pickedFactors.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFactor(f)}
                  className={`min-h-[40px] px-3 rounded-xl text-xs sm:text-sm font-heading font-bold border-2 cursor-pointer transition ${
                    active
                      ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)]'
                  }`}
                >
                  {active ? '✓ ' : '+ '}
                  {f}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          disabled={!techName.trim() || !pastToNow.trim() || pickedFactors.length === 0}
          onClick={() => {
            setSavedLog(prev => [
              { tech: techName.trim(), change: pastToNow.trim(), factors: [...pickedFactors] },
              ...prev
            ]);
            setPastToNow('');
          }}
          className="btn-secondary-3d"
        >
          บันทึกลงตารางกิจกรรม 2.1
        </button>

        {savedLog.length > 0 && (
          <div className="space-y-2 pt-2">
            {savedLog.map((row, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-sm">
                <div className="font-heading font-bold text-[var(--color-primary)]">{row.tech}</div>
                <p className="mt-0.5">{row.change}</p>
                <div className="text-xs text-[var(--text-secondary)] mt-1">
                  ปัจจัย: {row.factors.join(' • ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
