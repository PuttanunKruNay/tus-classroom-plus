'use client';

import { useState } from 'react';
import { Scale, ShieldCheck, Eye, CheckCircle2, ClipboardList } from 'lucide-react';

interface Chapter3LabProps {
  currentStepIdx: number;
  onSelectStep: (idx: number) => void;
}

interface ImpactRow {
  domain: string;
  positive: string;
  negative: string;
  mitigation: string;
}

interface CaseStudy {
  id: 'acid_soil' | 'airport' | 'dam';
  label: string;
  problem: string;
  techUsed: string;
  rows: ImpactRow[];
}

const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'acid_soil',
    label: '1. โครงการแกล้งดิน (ตาราง 3.1)',
    problem: 'ดินพรุมีความเป็นกรดจัด (ดินเปรี้ยว) จนไม่สามารถเพาะปลูกพืชผลทางการเกษตรได้',
    techUsed: 'การควบคุมระดับน้ำทำให้ดินแห้งสลับเปียกเพื่อเร่งปฏิกิริยาเคมี แล้วชะล้างความเป็นกรดและปรับปรุงดินด้วยปูนฝุ่น/ปูนมาร์ล',
    rows: [
      {
        domain: 'มนุษย์และสังคม',
        positive: 'เกษตรกรในพื้นที่สามารถกลับมาเพาะปลูกได้ มีคุณภาพชีวิตและความมั่นคงทางอาหารดีขึ้น',
        negative: 'ต้องอาศัยความรู้ความเข้าใจและการปรับเปลี่ยนวิถีการจัดการพื้นที่เกษตรของชุมชน',
        mitigation: 'อบรมให้ความรู้และถ่ายทอดขั้นตอนการจัดการดินเปรี้ยวอย่างถูกต้องผ่านศูนย์ศึกษาการพัฒนาฯ'
      },
      {
        domain: 'เศรษฐกิจ',
        positive: 'เพิ่มพื้นที่ทำกินและสร้างรายได้ให้เกษตรกรในพื้นที่พรุอย่างยั่งยืน',
        negative: 'มีค่าใช้จ่ายเบื้องต้นในการปรับปรุงดินและจัดทำระบบระบายน้ำ',
        mitigation: 'วางแผนการผลิตให้เหมาะสมกับศักยภาพของดินและใช้ทรัพยากรในท้องถิ่นอย่างคุ้มค่า'
      },
      {
        domain: 'สิ่งแวดล้อม',
        positive: 'ฟื้นฟูสภาพดินเปรี้ยวจัดให้กลับมาอุดมสมบูรณ์และลดความเป็นกรดของพื้นที่',
        negative: 'อาจเกิดสารเคมีตกค้างถ้าใช้เกินจำเป็น และน้ำชะล้างมีความเป็นกรดสูง',
        mitigation: 'วางแผนและใช้สารเคมีอย่างรัดกุมเหมาะสม พร้อมจัดการระบบบำบัด/ควบคุมน้ำเปรี้ยวก่อนปล่อยสู่แหล่งน้ำธรรมชาติ'
      }
    ]
  },
  {
    id: 'airport',
    label: '2. การสร้างสนามบิน (ตาราง 3.2)',
    problem: 'ความต้องการเดินทางและการขนส่งสินค้าทางอากาศที่รวดเร็วและรองรับจำนวนผู้โดยสารที่เพิ่มขึ้น',
    techUsed: 'เทคโนโลยีวิศวกรรมโยธา การก่อสร้างรันเวย์ อาคารผู้โดยสาร และระบบควบคุมการจราจรทางอากาศ',
    rows: [
      {
        domain: 'มนุษย์และสังคม',
        positive: 'อำนวยความสะดวกในการเดินทางติดต่อสื่อสาร เชื่อมโยงภูมิภาคและนานาชาติได้รวดเร็ว',
        negative: 'มลพิษทางเสียงจากเครื่องบินรบกวนชุมชนใกล้เคียง และอาจต้องโยกย้ายชุมชนบางส่วน',
        mitigation: 'กำหนดแนวเขตควบคุมเสียง ติดตั้งอุปกรณ์ลดเสียง จัดเส้นทางบิน และชดเชยดูแลชุมชนรอบสนามบินอย่างเป็นธรรม'
      },
      {
        domain: 'เศรษฐกิจ',
        positive: 'กระตุ้นการท่องเที่ยว การค้า การลงทุน และการจ้างงานในพื้นที่และระดับประเทศ',
        negative: 'ใช้งบประมาณลงทุนและค่าบำรุงรักษาสูง พื้นที่เกษตรกรรมเดิมลดลง',
        mitigation: 'ศึกษาความคุ้มค่าทางเศรษฐกิจและวางผังพัฒนาพื้นที่รอบสนามบินให้ชุมชนมีส่วนร่วม'
      },
      {
        domain: 'สิ่งแวดล้อม',
        positive: 'ส่งเสริมการใช้เทคโนโลยีตรวจวัดและจัดการพลังงานในอาคารสมัยใหม่',
        negative: 'มลพิษทางอากาศและเสียงจากการบิน รวมถึงการเปลี่ยนแปลงระบบระบายน้ำและพื้นที่สีเขียว',
        mitigation: 'จัดทำรายงาน EIA อย่างเคร่งครัด ตรวจวัดคุณภาพอากาศ-เสียงสม่ำเสมอ และเพิ่มพื้นที่สีเขียวโดยรอบ'
      }
    ]
  },
  {
    id: 'dam',
    label: '3. การสร้างเขื่อน',
    problem: 'ความต้องการกักเก็บน้ำเพื่อการเกษตร อุปโภคบริโภค ป้องกันน้ำท่วม และผลิตกระแสไฟฟ้า',
    techUsed: 'เทคโนโลยีวิศวกรรมโครงสร้างเขื่อน ประตูระบายน้ำ และกังหันน้ำผลิตไฟฟ้าพลังงานน้ำ',
    rows: [
      {
        domain: 'มนุษย์และสังคม',
        positive: 'มีน้ำใช้เพื่อการเกษตรและอุปโภคบริโภคตลอดปี ลดความเสียหายจากอุทกภัย',
        negative: 'ชุมชนเหนือเขื่อนอาจต้องอพยพย้ายถิ่นฐานและปรับเปลี่ยนวิถีชีวิตดั้งเดิม',
        mitigation: 'รับฟังความคิดเห็นของประชาชน จัดสรรพื้นที่ทำกินใหม่ และเยียวยาอย่างเป็นธรรม'
      },
      {
        domain: 'เศรษฐกิจ',
        positive: 'เพิ่มผลผลิตทางการเกษตร ผลิตพลังงานไฟฟ้า และส่งเสริมการท่องเที่ยวรอบอ่างเก็บน้ำ',
        negative: 'ต้นทุนการก่อสร้างสูงและอาจกระทบต่ออาชีพประมงพื้นบ้านบางส่วน',
        mitigation: 'วางแผนการบริหารจัดการน้ำร่วมกับชุมชนและส่งเสริมอาชีพทางเลือกที่ยั่งยืน'
      },
      {
        domain: 'สิ่งแวดล้อม',
        positive: 'ช่วยผลิตไฟฟ้าพลังงานสะอาด ลดการเผาไหม้เชื้อเพลิงฟอสซิล',
        negative: 'สูญเสียพื้นที่ป่าไม้และแหล่งที่อยู่อาศัยของสัตว์ป่าบริเวณอ่างเก็บน้ำ และกระทบการอพยพของปลา',
        mitigation: 'ประเมินผลกระทบ EIA ปลูกป่าทดแทน และสร้างบันไดปลาโจนเพื่อรักษาสมดุลระบบนิเวศ'
      }
    ]
  }
];

const EIA_ASPECTS = [
  '1. ทรัพยากรกายภาพ (ดิน น้ำ อากาศ เสียง)',
  '2. ทรัพยากรชีวภาพ (ป่าไม้ สัตว์ป่า ระบบนิเวศ)',
  '3. คุณค่าการใช้ประโยชน์ของมนุษย์ (คมนาคม เกษตรกรรม สาธารณูปโภค)',
  '4. คุณค่าต่อคุณภาพชีวิต (สังคม เศรษฐกิจ สุขอนามัย วัฒนธรรม)'
];

export function Chapter3Lab({ currentStepIdx, onSelectStep }: Chapter3LabProps) {
  const [caseId, setCaseId] = useState<'acid_soil' | 'airport' | 'dam'>('acid_soil');
  const [revealedMitigations, setRevealedMitigations] = useState<Record<string, boolean>>({});
  const [weighGuess, setWeighGuess] = useState<'pos' | 'neg' | null>(null);

  // Community activity
  const [communityTech, setCommunityTech] = useState('ไฟฟ้าแสงสว่างในชุมชน');
  const [commPos, setCommPos] = useState('');
  const [commNeg, setCommNeg] = useState('');
  const [commFix, setCommFix] = useState('');
  const [savedComm, setSavedComm] = useState<{ tech: string; pos: string; neg: string; fix: string }[]>([]);

  const activeCase = CASE_STUDIES.find(c => c.id === caseId) || CASE_STUDIES[0];

  function toggleReveal(key: string) {
    setRevealedMitigations(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-6">
      {/* 1. ตาชั่งสมดุล 3 แถบ + เลือกกรณีศึกษา 3 ปุ่ม */}
      <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-heading font-bold text-lg flex items-center gap-2">
            <Scale className="w-5 h-5 text-[var(--color-primary)]" />
            ตาชั่งสมดุลผลกระทบ 3 ด้าน (ตามตาราง 3.1 และ 3.2)
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {CASE_STUDIES.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCaseId(c.id);
                  setWeighGuess(null);
                }}
                className={`min-h-[40px] px-3.5 rounded-xl text-xs sm:text-sm font-heading font-bold border-2 cursor-pointer transition ${
                  caseId === c.id
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* แถบขั้นที่ 1-5 */}
        <div className="flex flex-wrap gap-1.5">
          {['1. ปัญหาเดิม', '2. ใช้เทคโนโลยี', '3. ผลบวก', '4. ผลลบ', '5. ป้องกันและแก้ไข'].map((lbl, idx) => (
            <button
              key={lbl}
              type="button"
              onClick={() => onSelectStep(idx)}
              className={`min-h-[38px] px-3 rounded-xl text-xs font-heading font-bold border-2 cursor-pointer ${
                currentStepIdx === idx
                  ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)]'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3.5 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)]">
            <div className="text-xs font-heading font-bold text-[var(--color-primary)]">1. ปัญหาเดิม</div>
            <p className="mt-1">{activeCase.problem}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)]">
            <div className="text-xs font-heading font-bold text-[var(--color-primary)]">2. เทคโนโลยีที่นำมาใช้</div>
            <p className="mt-1">{activeCase.techUsed}</p>
          </div>
        </div>

        {/* 3 แถวตาชั่งสมดุล */}
        <div className="space-y-3">
          {activeCase.rows.map(row => {
            const key = `${activeCase.id}-${row.domain}`;
            const revealed = Boolean(revealedMitigations[key]);
            return (
              <div key={key} className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-3">
                <div className="font-heading font-bold text-base text-[var(--color-primary)]">{row.domain}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm sm:text-base">
                  <div className="p-3.5 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success-border)]">
                    <div className="text-xs font-heading font-bold text-[var(--color-success)]">ด้านบวก (+)</div>
                    <p className="mt-1">{row.positive}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30">
                    <div className="text-xs font-heading font-bold text-[var(--color-danger)]">ด้านลบ (−)</div>
                    <p className="mt-1">{row.negative}</p>
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => toggleReveal(key)}
                    className="btn-secondary-3d btn-compact-3d"
                  >
                    <Eye className="w-4 h-4" />
                    {revealed ? 'ซ่อนแนวทางป้องกันและแก้ไข' : 'กดเปิดดูแนวทางป้องกันและแก้ไข'}
                  </button>
                  {revealed && (
                    <div className="mt-2 p-3.5 rounded-xl bg-[var(--bg-surface)] border-2 border-[var(--color-primary-border)] text-sm sm:text-base animate-scale-pop">
                      <strong className="text-[var(--color-primary)]">แนวทางป้องกันและแก้ไข:</strong> {row.mitigation}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* กรอบ EIA 4 ด้าน */}
        <div className="p-4 rounded-2xl bg-[var(--color-primary-soft)] border border-[var(--color-primary-border)] space-y-2">
          <div className="font-heading font-bold text-sm text-[var(--color-primary)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            การประเมินผลกระทบสิ่งแวดล้อม (EIA) ศึกษา 4 ด้านสำคัญ
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {EIA_ASPECTS.map(a => (
              <div key={a} className="px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                {a}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. กิจกรรม “ชั่งใจ” */}
      <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-3">
        <h3 className="font-heading font-bold text-lg text-[var(--text-primary)]">
          กิจกรรม “ชั่งใจ” : คุณคิดว่าเทคโนโลยีมีด้านบวกหรือด้านลบหนักกว่ากัน?
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setWeighGuess('pos')}
            className={`btn-secondary-3d ${weighGuess === 'pos' ? '!border-[var(--color-success)] !text-[var(--color-success)]' : ''}`}
          >
            ด้านบวกหนักกว่า
          </button>
          <button
            type="button"
            onClick={() => setWeighGuess('neg')}
            className={`btn-secondary-3d ${weighGuess === 'neg' ? '!border-[var(--color-danger)] !text-[var(--color-danger)]' : ''}`}
          >
            ด้านลบหนักกว่า
          </button>
        </div>
        {weighGuess && (
          <div className="p-4 rounded-2xl bg-[var(--color-gold-bg)] border-2 border-[var(--color-gold-border)] text-sm sm:text-base animate-scale-pop">
            <div className="font-heading font-bold text-[var(--color-gold)] flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5" /> ข้อคิดสำคัญท้ายบทที่ 3
            </div>
            <p className="mt-1 font-medium">
              “ผลกระทบด้านลบมากกว่าด้านบวกได้ถ้าขาดความรับผิดชอบ” — ดังนั้นก่อนนำเทคโนโลยีมาใช้จึงต้องวิเคราะห์ผลกระทบทั้ง 3 ด้านและวางแนวทางป้องกันควบคู่กันเสมอ
            </p>
          </div>
        )}
      </section>

      {/* 3. กิจกรรมท้ายบท: เทคโนโลยีในชุมชน */}
      <section className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4">
        <h3 className="font-heading font-bold text-lg flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-[var(--color-primary)]" />
          กิจกรรมท้ายบท : วิเคราะห์เทคโนโลยีในชุมชนของเรา
        </h3>
        <div className="flex flex-wrap gap-2">
          {['ไฟฟ้าแสงสว่างในชุมชน', 'ระบบจัดการขยะชุมชน', 'ระบบจัดการน้ำชุมชน'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setCommunityTech(t)}
              className={`min-h-[40px] px-3.5 rounded-xl text-sm font-heading font-bold border-2 cursor-pointer ${
                communityTech === t
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={commPos}
            onChange={e => setCommPos(e.target.value)}
            placeholder="ผลกระทบด้านบวก..."
            className="tus-input"
          />
          <input
            type="text"
            value={commNeg}
            onChange={e => setCommNeg(e.target.value)}
            placeholder="ผลกระทบด้านลบ..."
            className="tus-input"
          />
          <input
            type="text"
            value={commFix}
            onChange={e => setCommFix(e.target.value)}
            placeholder="แนวทางป้องกันและแก้ไข..."
            className="tus-input"
          />
        </div>
        <button
          type="button"
          disabled={!commPos.trim() || !commNeg.trim() || !commFix.trim()}
          onClick={() => {
            setSavedComm(prev => [
              { tech: communityTech, pos: commPos.trim(), neg: commNeg.trim(), fix: commFix.trim() },
              ...prev
            ]);
            setCommPos('');
            setCommNeg('');
            setCommFix('');
          }}
          className="btn-secondary-3d"
        >
          บันทึกผลการวิเคราะห์ชุมชน
        </button>

        {savedComm.length > 0 && (
          <div className="space-y-2">
            {savedComm.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-sm space-y-1">
                <div className="font-heading font-bold text-[var(--color-primary)]">{item.tech}</div>
                <p><strong>ด้านบวก:</strong> {item.pos}</p>
                <p><strong>ด้านลบ:</strong> {item.neg}</p>
                <p><strong>แนวทางแก้:</strong> {item.fix}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
