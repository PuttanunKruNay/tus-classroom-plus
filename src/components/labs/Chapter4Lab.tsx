'use client';

import { useState } from 'react';
import { Hammer, ShieldAlert, CheckCircle2, Flame, Snowflake, Layers } from 'lucide-react';

interface Chapter4LabProps {
  currentStepIdx: number;
  onSelectStep: (idx: number) => void;
}

const MATERIALS_5_GROUPS = [
  {
    id: 'steel',
    name: 'เหล็ก (โลหะกลุ่มเหล็ก / Ferrous)',
    subtypes: 'เหล็กฉาก, เหล็กกลม, เหล็กกล่อง, เหล็กรางน้ำ, เหล็กแผ่น, ท่อเหล็ก',
    elasticity: 2,
    strength: 3,
    heat: 3,
    example: 'โครงสร้างสะพาน โครงหลังคาโรงงาน สปริงเหล็กกล้า'
  },
  {
    id: 'aluminum',
    name: 'อะลูมิเนียม / ทองแดง (ไม่ใช่เหล็ก / Non-ferrous)',
    subtypes: 'อะลูมิเนียม, ทองแดง, ทองเหลือง และโลหะผสม (Alloy)',
    elasticity: 2,
    strength: 2,
    heat: 3,
    example: 'ก้นหม้อ กระทะอะลูมิเนียม แผ่นความร้อนหม้อหุงข้าว สายไฟทองแดง'
  },
  {
    id: 'wood',
    name: 'ไม้ธรรมชาติและไม้สังเคราะห์',
    subtypes: 'ไม้จริง, ไม้พลาสติก, MDF, ปาร์ติเคิลบอร์ด, ไม้อัด',
    elasticity: 2,
    strength: 2,
    heat: 1,
    example: 'ด้ามจับกระทะ/หม้อ ฉากกั้นห้อง โต๊ะ เฟอร์นิเจอร์'
  },
  {
    id: 'glass',
    name: 'เซรามิก (กระจกชนิดต่างๆ)',
    subtypes: 'กระจกแผ่น, กระจกเงา, กระจกสะท้อนแสง, นิรภัย, นิรภัยกึ่ง, ฉนวนความร้อน',
    elasticity: 1,
    strength: 2,
    heat: 1,
    example: 'หน้าต่างอาคาร กระจกรถยนต์ (กระจกนิรภัย) ถ้วยชามเซรามิก'
  },
  {
    id: 'composite_nano',
    name: 'วัสดุผสม (Composite) & วัสดุใหม่ (นาโน)',
    subtypes: 'PMC, MMC, CMC และวัสดุนาโน (คาร์บอนนาโนทูบ, นาโนไททาเนียมไดออกไซด์, เส้นใยนาโน)',
    elasticity: 3,
    strength: 3,
    heat: 2,
    example: 'โครงจักรยานคาร์บอนไฟเบอร์ ชิ้นส่วนอากาศยาน ผ้านาโนกันน้ำ'
  }
];

const JOB_MATERIAL_QUIZ = [
  {
    id: 'handle',
    job: 'ด้ามจับหม้อหุงต้ม',
    options: [
      { label: 'ไม้หรือพลาสติกทนความร้อน (นำความร้อนต่ำ)', ok: true, reason: 'นำความร้อนต่ำ ช่วยป้องกันไม่ให้มือพองขณะจับ' },
      { label: 'ทองแดงบริสุทธิ์ (นำความร้อนสูง)', ok: false, reason: 'ทองแดงนำความร้อนเร็วมาก ทำให้จับด้ามหม้อไม่ได้' }
    ]
  },
  {
    id: 'factory',
    job: 'โครงสร้างหลังคาโรงงาน',
    options: [
      { label: 'เหล็กฉาก/เหล็กกล่อง (ความแข็งแรงสูง)', ok: true, reason: 'รับน้ำหนักและแรงดึงแรงอัดได้สูงมาก' },
      { label: 'กระจกแผ่นธรรมดา (เปราะ)', ok: false, reason: 'กระจกเปราะแตกหักง่ายเมื่อรับแรงกระแทกหรือแรงดัด' }
    ]
  },
  {
    id: 'partition',
    job: 'ฉากกั้นห้องภายในอาคาร',
    options: [
      { label: 'ไม้อัด / แผ่น MDF (น้ำหนักพอเหมาะ ขึ้นรูปง่าย)', ok: true, reason: 'ตัดต่อติดตั้งได้สะดวกและเป็นฉนวนความร้อน/เสียงได้ดี' },
      { label: 'เหล็กหล่อตันหนา (หนักมาก)', ok: false, reason: 'น้ำหนักมากเกินความจำเป็นและสิ้นเปลืองต้นทุน' }
    ]
  },
  {
    id: 'window',
    job: 'หน้าต่างรับแสงและกันลมฝน',
    options: [
      { label: 'กระจกนิรภัย / กระจกฉนวนความร้อน', ok: true, reason: 'โปร่งแสง กันลมฝน และปลอดภัยกว่ากระจกธรรมดา' },
      { label: 'แผ่นปาร์ติเคิลบอร์ด', ok: false, reason: 'ทึบแสงและบวมเสียหายเมื่อโดนน้ำฝน' }
    ]
  }
];

const TOOL_SAFETY_TASKS = [
  {
    id: 'wire',
    task: 'วัดความหนาเส้นลวดขนาดเล็กมากอย่างละเอียด',
    correct: 'ไมโครมิเตอร์',
    options: ['ไมโครมิเตอร์', 'ไม้โปรแทรกเตอร์', 'สว่านไฟฟ้า'],
    safetyWarning: 'เลือกเครื่องมือผิดประเภทอาจทำให้ชิ้นงานเสียหายหรือเกิดอุบัติเหตุได้ — งานวัดความละเอียดสูงต้องใช้ไมโครมิเตอร์หรือเวอร์เนียร์คาลิเปอร์เท่านั้น',
    ppe: 'วางชิ้นงานบนพื้นเรียบ ตรวจสอบศูนย์ก่อนวัด'
  },
  {
    id: 'angle',
    task: 'วัดมุมองศาของแผ่นชิ้นงานก่อนตัด',
    correct: 'ไม้โปรแทรกเตอร์',
    options: ['ไม้โปรแทรกเตอร์', 'คีมตัดลวด', 'ตะไบเหล็ก'],
    safetyWarning: 'คำเตือนความปลอดภัย: ห้ามใช้เครื่องมือตัดแทนเครื่องมือวัด เพราะอาจบาดมือและทำให้ชิ้นงานคลาดเคลื่อน!',
    ppe: 'ตรวจจุดหมุนของไม้โปรแทรกเตอร์ให้แนบขอบชิ้นงาน'
  },
  {
    id: 'concrete',
    task: 'เจาะผนังปูนเพื่อติดตั้งชั้นวาง',
    correct: 'สว่านไฟฟ้าพร้อมดอกสว่านสำหรับปูน',
    options: ['สว่านไฟฟ้าพร้อมดอกสว่านสำหรับปูน', 'ดอกสว่านเจาะไม้ธรรมดา', 'เลื่อยจิ๊กซอว์'],
    safetyWarning: 'คำเตือนความปลอดภัยร้ายแรง: การใช้ดอกสว่านผิดวัสดุหรือใช้เลื่อยเจาะปูนอาจทำให้ดอกสว่านหักกระเด็นเข้าตาได้!',
    ppe: 'ต้องสวมแว่นตานิรภัย หน้ากากกันฝุ่น และจับสว่านให้มั่นคงทั้งสองมือ'
  }
];

const JOIN_MAP: Record<'wood' | 'metal' | 'plastic', { best: string; options: string[]; note: string }> = {
  wood: {
    best: 'ตะปู / สกรู / กาวงานไม้',
    options: ['ตะปู / สกรู / กาวงานไม้', 'การเชื่อมไฟฟ้า (Welding)', 'การบัดกรีตะกั่ว (Soldering)'],
    note: 'งานไม้นิยมยึดต่อด้วยตะปู สกรู หรือกาวลาเท็กซ์/กาวงานไม้ และห้ามใช้ความร้อนเชื่อมเพราะไม้จะติดไฟ'
  },
  metal: {
    best: 'การเชื่อม (Welding) / บัดกรี (Soldering) / สกรูโลหะ',
    options: ['กาวแท่งกระดาษ', 'การเชื่อม (Welding) / บัดกรี (Soldering) / สกรูโลหะ', 'เทปกาวใส'],
    note: 'โลหะต่อด้วยสกรู การเชื่อมไฟฟ้า (งานโครงสร้าง) หรือการบัดกรี (งานวงจรไฟฟ้า) ต้องสวมหน้ากากเชื่อมและถุงมือกันความร้อน'
  },
  plastic: {
    best: 'กาวประสานพลาสติก / สกรูเกลียวปล่อย',
    options: ['การตีขึ้นรูปร้อนด้วยค้อน', 'กาวประสานพลาสติก / สกรูเกลียวปล่อย', 'ตะปูตอกคอนกรีต'],
    note: 'พลาสติกนิยมใช้กาวประสานเฉพาะทางหรือสกรูเกลียวปล่อยเพื่อไม่ให้แตกร้าว'
  }
};

export function Chapter4Lab({ currentStepIdx, onSelectStep }: Chapter4LabProps) {
  const [selectedMatId, setSelectedMatId] = useState('aluminum');
  const [testMode, setTestMode] = useState<'elasticity' | 'strength' | 'heat'>('heat');
  const [jobPicks, setJobPicks] = useState<Record<string, number>>({});
  const [toolPicks, setToolPicks] = useState<Record<string, string>>({});
  const [joinMat, setJoinMat] = useState<'wood' | 'metal' | 'plastic'>('metal');
  const [joinPick, setJoinPick] = useState('');
  const [formingMode, setFormingMode] = useState<'hot' | 'cold'>('hot');

  const activeTab = currentStepIdx % 4;
  const activeMat = MATERIALS_5_GROUPS.find(m => m.id === selectedMatId) || MATERIALS_5_GROUPS[0];
  const levelText = (v: number) => (v === 3 ? 'สูงมาก' : v === 2 ? 'ปานกลาง' : 'ต่ำ');

  return (
    <div className="space-y-5">
      {/* แท็บเลือก 4 กิจกรรม (A, B, C, D) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          'กิจกรรม A : ทดสอบสมบัติวัสดุ',
          'กิจกรรม B : เลือกวัสดุให้งาน',
          'กิจกรรม C : เลือกเครื่องมือ+ความปลอดภัย',
          'กิจกรรม D : ตัด ต่อ ขึ้นรูป'
        ].map((label, idx) => (
          <button
            key={label}
            type="button"
            onClick={() => onSelectStep(idx)}
            className={`min-h-[46px] px-3 py-2 rounded-xl text-xs sm:text-sm font-heading font-bold border-2 cursor-pointer transition text-left ${
              activeTab === idx
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* กิจกรรม A: ทดสอบสมบัติวัสดุ 5 กลุ่ม 3 สมบัติ */}
      {activeTab === 0 && (
        <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4 animate-fade-up">
          <h3 className="font-heading font-bold text-lg flex items-center gap-2">
            <Layers className="w-5 h-5 text-[var(--color-primary)]" />
            กิจกรรม A : ทดสอบสมบัติวัสดุ 5 กลุ่ม (ตามหนังสือ สสวท.)
          </h3>

          <div className="flex flex-wrap gap-2">
            {MATERIALS_5_GROUPS.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMatId(m.id)}
                className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-heading font-bold border-2 cursor-pointer transition ${
                  selectedMatId === m.id
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'elasticity' as const, label: 'ทดสอบบีบ/ดึง (ความยืดหยุ่น)' },
              { id: 'strength' as const, label: 'ทดสอบวางน้ำหนัก (ความแข็งแรง)' },
              { id: 'heat' as const, label: 'ทดสอบวางบนเตา (การนำความร้อน)' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTestMode(t.id)}
                className={`min-h-[40px] px-3.5 rounded-xl text-xs sm:text-sm font-heading font-bold border-2 cursor-pointer ${
                  testMode === t.id
                    ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'bg-[var(--bg-surface)] border-[var(--border-strong)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-3">
            <div>
              <div className="font-heading font-bold text-base text-[var(--color-primary)]">{activeMat.name}</div>
              <div className="text-xs sm:text-sm text-[var(--text-secondary)]">ชนิดย่อย: {activeMat.subtypes}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'elasticity' as const, label: 'ความยืดหยุ่น (Elasticity)', val: activeMat.elasticity },
                { key: 'strength' as const, label: 'ความแข็งแรง (Strength)', val: activeMat.strength },
                { key: 'heat' as const, label: 'การนำความร้อน (Heat)', val: activeMat.heat }
              ].map(bar => (
                <div
                  key={bar.key}
                  className={`p-3 rounded-xl border-2 transition ${
                    testMode === bar.key
                      ? 'bg-[var(--bg-surface)] border-[var(--color-primary)] shadow-sm'
                      : 'bg-[var(--bg-surface)]/70 border-[var(--border-subtle)]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-heading font-bold">
                    <span>{bar.label}</span>
                    <span className="text-[var(--color-primary)]">{levelText(bar.val)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 mt-2">
                    {[1, 2, 3].map(n => (
                      <div
                        key={n}
                        className={`h-3 rounded-full ${
                          n <= bar.val
                            ? bar.key === 'heat' && bar.val === 3
                              ? 'bg-[#B8194F]'
                              : 'bg-[var(--color-primary)]'
                            : 'bg-[var(--border-subtle)]'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-sm">
              <strong>ตัวอย่างการใช้งานจริง:</strong> {activeMat.example}
            </div>
          </div>
        </section>
      )}

      {/* กิจกรรม B: เลือกวัสดุให้งาน */}
      {activeTab === 1 && (
        <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4 animate-fade-up">
          <h3 className="font-heading font-bold text-lg">กิจกรรม B : เลือกวัสดุให้เหมาะสมกับงาน</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {JOB_MATERIAL_QUIZ.map(q => {
              const pickIdx = jobPicks[q.id];
              const pickedOpt = pickIdx !== undefined ? q.options[pickIdx] : null;
              return (
                <div key={q.id} className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-2.5">
                  <div className="font-heading font-bold text-base text-[var(--color-primary)]">โจทย์: {q.job}</div>
                  <div className="space-y-2">
                    {q.options.map((opt, idx) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setJobPicks(prev => ({ ...prev, [q.id]: idx }))}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium border-2 cursor-pointer transition ${
                          pickIdx === idx
                            ? opt.ok
                              ? 'bg-[var(--color-success-bg)] border-[var(--color-success)] font-bold'
                              : 'bg-[var(--color-danger-bg)] border-[var(--color-danger)] font-bold'
                            : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {pickedOpt && (
                    <div
                      className={`text-sm font-medium ${
                        pickedOpt.ok ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
                      }`}
                    >
                      {pickedOpt.ok ? '✓ ถูกต้อง: ' : '✗ ยังไม่เหมาะสม: '}
                      {pickedOpt.reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* กิจกรรม C: เลือกเครื่องมือ + คำเตือนความปลอดภัย */}
      {activeTab === 2 && (
        <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading font-bold text-lg flex items-center gap-2">
              <Hammer className="w-5 h-5 text-[var(--color-primary)]" />
              กิจกรรม C : เลือกเครื่องมือวัด / ตัด / เจาะ อย่างปลอดภัย
            </h3>
            <span className="text-xs font-heading font-bold px-3 py-1 rounded-full bg-[var(--color-gold-bg)] text-[var(--color-gold)] border border-[var(--color-gold-border)]">
              อุปกรณ์ป้องกัน: แว่นตา • ถุงมือ • หน้ากากกันฝุ่น
            </span>
          </div>

          <div className="space-y-3">
            {TOOL_SAFETY_TASKS.map(t => {
              const pick = toolPicks[t.id];
              const isOk = pick === t.correct;
              const isWrong = Boolean(pick && pick !== t.correct);
              return (
                <div key={t.id} className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-2.5">
                  <div className="font-heading font-bold text-base">งานที่ต้องการทำ: {t.task}</div>
                  <div className="flex flex-wrap gap-2">
                    {t.options.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setToolPicks(prev => ({ ...prev, [t.id]: opt }))}
                        className={`min-h-[42px] px-3.5 py-2 rounded-xl text-sm font-heading font-bold border-2 cursor-pointer transition ${
                          pick === opt
                            ? opt === t.correct
                              ? 'bg-[var(--color-success)] text-white border-[var(--color-success)]'
                              : 'bg-[var(--color-danger)] text-white border-[var(--color-danger)]'
                            : 'bg-[var(--bg-surface)] border-[var(--border-strong)] hover:border-[var(--color-primary)]'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {isWrong && (
                    <div className="p-3 rounded-xl bg-[var(--color-danger-bg)] border-2 border-[var(--color-danger)] text-sm text-[var(--color-danger)] font-bold flex items-start gap-2 animate-scale-pop">
                      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>{t.safetyWarning}</span>
                    </div>
                  )}
                  {isOk && (
                    <div className="p-3 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success-border)] text-sm text-[var(--color-success)] font-bold flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>ถูกต้อง! ข้อควรระวังความปลอดภัย: {t.ppe}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* กิจกรรม D: ตัด ต่อ ขึ้นรูป (ร้อน vs เย็น) */}
      {activeTab === 3 && (
        <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-5 animate-fade-up">
          <div className="space-y-3">
            <h3 className="font-heading font-bold text-lg">กิจกรรม D.1 : จับคู่วิธีต่อวัสดุ (Joining)</h3>
            <div className="flex flex-wrap gap-2">
              {([
                { id: 'wood' as const, label: 'ไม้' },
                { id: 'metal' as const, label: 'โลหะ' },
                { id: 'plastic' as const, label: 'พลาสติก' }
              ]).map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setJoinMat(m.id);
                    setJoinPick('');
                  }}
                  className={`min-h-[42px] px-4 rounded-xl text-sm font-heading font-bold border-2 cursor-pointer ${
                    joinMat === m.id
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {JOIN_MAP[joinMat].options.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setJoinPick(opt)}
                  className={`min-h-[42px] px-3.5 py-2 rounded-xl text-sm font-heading font-bold border-2 cursor-pointer ${
                    joinPick === opt
                      ? opt === JOIN_MAP[joinMat].best
                        ? 'bg-[var(--color-success)] text-white border-[var(--color-success)]'
                        : 'bg-[var(--color-danger)] text-white border-[var(--color-danger)]'
                      : 'bg-[var(--bg-surface-muted)] border-[var(--border-strong)]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {joinPick && (
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-sm">
                <strong>{joinPick === JOIN_MAP[joinMat].best ? '✓ เหมาะสม: ' : '✗ ไม่เหมาะสม: '}</strong>
                {JOIN_MAP[joinMat].note}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
            <h3 className="font-heading font-bold text-lg">กิจกรรม D.2 : เปรียบเทียบการขึ้นรูปแบบร้อน vs แบบเย็น</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFormingMode('hot')}
                className={`btn-secondary-3d ${formingMode === 'hot' ? '!border-[var(--color-danger)] !text-[var(--color-danger)]' : ''}`}
              >
                <Flame className="w-4 h-4" /> ขึ้นรูปแบบร้อน (ตีขึ้นรูป Forging / รีดร้อน)
              </button>
              <button
                type="button"
                onClick={() => setFormingMode('cold')}
                className={`btn-secondary-3d ${formingMode === 'cold' ? '!border-[var(--color-primary)] !text-[var(--color-primary)]' : ''}`}
              >
                <Snowflake className="w-4 h-4" /> ขึ้นรูปแบบเย็น (ดัดท่อ Bending / รีด-อัด)
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] flex flex-col sm:flex-row items-center gap-4">
              <div
                className={`w-28 h-20 rounded-2xl flex items-center justify-center font-heading font-extrabold text-white shadow-md shrink-0 transition-all duration-500 ${
                  formingMode === 'hot'
                    ? 'bg-gradient-to-r from-orange-600 via-red-600 to-amber-500 animate-pulse'
                    : 'bg-gradient-to-r from-slate-500 to-slate-700'
                }`}
              >
                {formingMode === 'hot' ? '900+ °C' : '25 °C'}
              </div>
              <div className="text-sm sm:text-base space-y-1">
                <div className="font-heading font-bold text-[var(--color-primary)]">
                  {formingMode === 'hot'
                    ? 'การขึ้นรูปแบบร้อน (Hot Forming — Forging / รีดร้อน)'
                    : 'การขึ้นรูปแบบเย็น (Cold Forming — Bending / Extruding / Squeezing)'}
                </div>
                <p>
                  {formingMode === 'hot'
                    ? 'เผาโลหะจนร้อนแดงให้อ่อนตัว แล้วใช้ค้อนตีขึ้นรูป (Forging) หรือรีดร้อน เหมาะกับชิ้นงานเหล็กหนาที่ต้องการเปลี่ยนรูปทรงมาก'
                    : 'ออกแรงดัด (Bending) รีด หรืออัดชิ้นงานที่อุณหภูมิห้องโดยไม่เผาไฟ ผิวงานเรียบและได้ขนาดแม่นยำ เช่น การดัดท่อโลหะหรือขึ้นรูปแผ่นบาง'}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
