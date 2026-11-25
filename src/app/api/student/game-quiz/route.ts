import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { todayBangkokDate } from '@/lib/utils';

const DAILY_XP_CAP = 150;
const QUIZ_BONUS_SCORE = 30;
const QUIZ_BONUS_XP = 5;

interface GameTriviaItem {
  id: string;
  topic: string;
  q: string;
  options: string[];
  answer: number;
  explanation: string;
}

// คลังคำถามรายวิชาการออกแบบและเทคโนโลยี ชั้น ม.4 (ว30184) — เก็บเฉลยเฉพาะฝั่งเซิร์ฟเวอร์เท่านั้น!
const COURSE_TRIVIA_BANK: GameTriviaItem[] = [
  {
    id: 'TQ-01',
    topic: 'บทที่ 1: ระบบทางเทคโนโลยี',
    q: 'องค์ประกอบใดทำหน้าที่ส่งข้อมูลกลับไปควบคุมการทำงานของระบบอัตโนมัติ (เช่น เซนเซอร์วัดอุณหภูมิแอร์)?',
    options: ['ก. ตัวป้อน (Input)', 'ข. ข้อมูลย้อนกลับ (Feedback)', 'ค. ผลผลิต (Output)', 'ง. บรรจุภัณฑ์'],
    answer: 1,
    explanation: 'เซนเซอร์จะวัดค่าแล้วส่งเป็นข้อมูลย้อนกลับ (Feedback) เพื่อให้ระบบปรับการทำงานอัตโนมัติ'
  },
  {
    id: 'TQ-02',
    topic: 'บทที่ 6: ออกแบบเชิงวิศวกรรม',
    q: 'ขั้นตอนแรกสุดของ "กระบวนการออกแบบเชิงวิศวกรรม 6 ขั้นตอน" คือข้อใด?',
    options: ['ก. ระบุปัญหา (Problem Identification)', 'ข. ทดสอบชิ้นงาน', 'ค. นำเสนอผลงาน', 'ง. ซื้อวัสดุ'],
    answer: 0,
    explanation: 'ต้องเริ่มจากการระบุปัญหาให้ชัดเจนก่อน จึงจะรวบรวมข้อมูลและออกแบบวิธีแก้ปัญหาได้ตรงจุด'
  },
  {
    id: 'TQ-03',
    topic: 'บทที่ 4: วัสดุและเครื่องมือ',
    q: 'วัสดุประเภทใดมีสมบัติน้ำหนักเบา ไม่นำไฟฟ้า และนิยมทำฉนวนหุ้มสายไฟ?',
    options: ['ก. โลหะทองแดง', 'ข. พอลิเมอร์ (พลาสติก/ยาง)', 'ค. เหล็กกล้า', 'ง. อะลูมิเนียม'],
    answer: 1,
    explanation: 'พอลิเมอร์ เช่น พลาสติกและยาง มีน้ำหนักเบา ขึ้นรูปง่าย และเป็นฉนวนไฟฟ้าได้ดี'
  },
  {
    id: 'TQ-04',
    topic: 'บทที่ 5: กลไกและไฟฟ้า',
    q: 'อุปกรณ์ใดเป็นกลไกที่ใช้ส่งผ่านการเคลื่อนที่และเปลี่ยนความเร็วรอบในการหมุน?',
    options: ['ก. เฟือง (Gears)', 'ข. ตัวต้านทาน', 'ค. หลอดไฟ LED', 'ง. สวิตช์ไฟ'],
    answer: 0,
    explanation: 'เฟือง (Gears) เป็นกลไกหลักในการส่งผ่านแรง เปลี่ยนทิศทาง และปรับความเร็วรอบการหมุน'
  },
  {
    id: 'TQ-05',
    topic: 'บทที่ 1: ระบบทางเทคโนโลยี',
    q: 'ในหม้อหุงข้าวไฟฟ้าอัตโนมัติ "ข้าวสาร น้ำ และพลังงานไฟฟ้า" จัดเป็นองค์ประกอบใด?',
    options: ['ก. ผลผลิต (Output)', 'ข. ตัวป้อน (Input)', 'ค. ข้อมูลย้อนกลับ (Feedback)', 'ง. ระบบย่อย'],
    answer: 1,
    explanation: 'สิ่งที่ใส่เข้าไปในระบบเพื่อให้เกิดการทำงานคือ ตัวป้อน (Input)'
  },
  {
    id: 'TQ-06',
    topic: 'บทที่ 3: ผลกระทบของเทคโนโลยี',
    q: 'ขยะอิเล็กทรอนิกส์ (E-Waste) เช่น แบตเตอรี่เสื่อมสภาพ ควรจัดการอย่างไรจึงจะเหมาะสมที่สุด?',
    options: [
      'ก. ทิ้งรวมกับขยะเปียกทั่วไป',
      'ข. เผากลางแจ้งให้หมดไป',
      'ค. คัดแยกและส่งจุดรับทิ้ง E-Waste เพื่อรีไซเคิลอย่างถูกวิธี',
      'ง. ฝังกลบในสวนหลังบ้าน'
    ],
    answer: 2,
    explanation: 'ขยะอิเล็กทรอนิกส์มีโลหะหนักอันตราย ต้องคัดแยกส่งศูนย์รีไซเคิลเฉพาะทางเพื่อลดมลพิษ'
  },
  {
    id: 'TQ-07',
    topic: 'บทที่ 6: ออกแบบเชิงวิศวกรรม',
    q: 'หลักการตั้งคำถาม 5W1H (Who, What, Where, When, Why, How) นิยมใช้ในขั้นตอนใด?',
    options: ['ก. ขั้นระบุปัญหาและวิเคราะห์กรอบปัญหา', 'ข. ขั้นทาสีตกแต่ง', 'ค. ขั้นจำหน่ายสินค้า', 'ง. ขั้นเก็บเครื่องมือ'],
    answer: 0,
    explanation: '5W1H ช่วยวิเคราะห์รายละเอียดของปัญหาให้ครบทุกมิติในขั้นระบุปัญหา'
  },
  {
    id: 'TQ-08',
    topic: 'บทที่ 2: การเปลี่ยนแปลงของเทคโนโลยี',
    q: 'ข้อใดคือปัจจัยหลักที่ขับเคลื่อนให้เทคโนโลยีเปลี่ยนแปลงอย่างต่อเนื่อง?',
    options: [
      'ก. ความต้องการแก้ปัญหาของมนุษย์และความก้าวหน้าทางวิทยาศาสตร์',
      'ข. ความต้องการทำให้เครื่องมือซับซ้อนขึ้นโดยไม่จำเป็น',
      'ค. การลดความสะดวกสบายของผู้ใช้งาน',
      'ง. การใช้ทรัพยากรธรรมชาติให้หมดเร็วขึ้น'
    ],
    answer: 0,
    explanation: 'เทคโนโลยีพัฒนาขึ้นเพื่อแก้ปัญหา ตอบสนองความต้องการของมนุษย์ และต่อยอดจากวิทยาศาสตร์'
  },
  {
    id: 'TQ-09',
    topic: 'บทที่ 4: วัสดุและเครื่องมือ',
    q: 'วัสดุกลุ่ม "เซรามิก" มีสมบัติเด่นข้อใด?',
    options: [
      'ก. อ่อนนุ่ม ยืดหยุ่นสูงมาก',
      'ข. ทนความร้อนสูง แข็งแต่เปราะ ไม่นำไฟฟ้า',
      'ค. นำไฟฟ้าได้ดีที่สุด',
      'ง. ละลายน้ำได้ง่าย'
    ],
    answer: 1,
    explanation: 'เซรามิก เช่น แก้วและกระเบื้อง ทนความร้อนสูงมาก แข็งแต่เปราะ และเป็นฉนวนไฟฟ้า'
  },
  {
    id: 'TQ-10',
    topic: 'บทที่ 1: ระบบทางเทคโนโลยี',
    q: 'ระบบรดน้ำต้นไม้อัตโนมัติจ่ายน้ำตลอดเวลาแม้ดินจะชุ่มแล้ว น่าจะเกิดข้อบกพร่องที่ส่วนใด?',
    options: [
      'ก. เซนเซอร์วัดความชื้นในดิน (Feedback) ชำรุด',
      'ข. ต้นไม้โตเร็วเกินไป',
      'ค. กระถางต้นไม้สีเข้มเกินไป',
      'ง. แสงแดดไม่พอ'
    ],
    answer: 0,
    explanation: 'เมื่อเซนเซอร์ความชื้น (Feedback) เสีย ระบบจะไม่รู้ว่าดินชุ่มแล้ว จึงไม่สั่งตัดปั๊มน้ำ'
  },
  {
    id: 'TQ-11',
    topic: 'บทที่ 5: กลไกและไฟฟ้า',
    q: 'ในระบบสมาร์ตฟาร์ม "บอร์ดไมโครคอนโทรลเลอร์" ทำหน้าที่คล้ายองค์ประกอบใดของระบบ?',
    options: ['ก. ตัวป้อน (Input)', 'ข. กระบวนการประมวลผลและสั่งการ (Process)', 'ค. ผลผลิต (Output)', 'ง. โครงสร้างภายนอก'],
    answer: 1,
    explanation: 'ไมโครคอนโทรลเลอร์ทำหน้าที่รับค่าจากเซนเซอร์มาประมวลผลและสั่งการอุปกรณ์ (Process)'
  },
  {
    id: 'TQ-12',
    topic: 'บทที่ 6: ออกแบบเชิงวิศวกรรม',
    q: 'เหตุใดจึงควรร่างภาพต้นแบบ (Sketch) ก่อนลงมือตัดวัสดุสร้างชิ้นงานจริง?',
    options: [
      'ก. ช่วยสื่อสารแนวคิดและลดข้อผิดพลาดหรือการสูญเสียวัสดุ',
      'ข. เพื่อไม่ต้องทดสอบชิ้นงานอีกต่อไป',
      'ค. เพื่อให้ใช้เวลาทำงานนานขึ้น',
      'ง. เพื่อใช้แทนการนำเสนอผลงาน'
    ],
    answer: 0,
    explanation: 'การร่างภาพช่วยให้เห็นขนาด สัดส่วน และจุดเชื่อมชัดเจนก่อนลงมือสร้างจริง ลดความเสียหายของวัสดุ'
  }
];

export async function GET(req: Request) {
  const auth = await requireRole(['student']);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const excludeParam = searchParams.get('exclude') || '';
  const excludeSet = new Set(excludeParam.split(',').filter(Boolean));

  const pool = COURSE_TRIVIA_BANK.filter(item => !excludeSet.has(item.id));
  const candidates = pool.length > 0 ? pool : COURSE_TRIVIA_BANK;
  const picked = candidates[Math.floor(Math.random() * candidates.length)];

  // ไม่ส่งเฉลย (answer) ไปยังเบราว์เซอร์นักเรียน!
  return NextResponse.json({
    ok: true,
    question: {
      id: picked.id,
      topic: picked.topic,
      q: picked.q,
      options: picked.options
    },
    bonusScore: QUIZ_BONUS_SCORE,
    bonusXp: QUIZ_BONUS_XP
  });
}

export async function POST(req: Request) {
  const auth = await requireRole(['student']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const questionId = String(body.questionId || '').trim();
    const selectedIndex = Number(body.selectedIndex);

    const item = COURSE_TRIVIA_BANK.find(q => q.id === questionId);
    if (!item) {
      return NextResponse.json({ ok: false, message: 'ไม่พบคำถามข้อนี้' }, { status: 404 });
    }

    const correct = selectedIndex === item.answer;
    let awardedXp = 0;
    let dailyXpUsed = 0;
    let gameXp = 0;

    const student = await db.getStudentById(auth.user.id);
    if (student) {
      const today = todayBangkokDate();
      const alreadyEarned = student.dailyXpDate === today ? student.dailyXpEarned || 0 : 0;
      const remaining = Math.max(0, DAILY_XP_CAP - alreadyEarned);

      if (correct) {
        awardedXp = Math.min(remaining, QUIZ_BONUS_XP);
        const updated = {
          ...student,
          gameXp: (student.gameXp || 0) + awardedXp,
          dailyXpDate: today,
          dailyXpEarned: alreadyEarned + awardedXp
        };
        await db.upsertStudent(updated);
        dailyXpUsed = updated.dailyXpEarned;
        gameXp = updated.gameXp;
      } else {
        dailyXpUsed = alreadyEarned;
        gameXp = student.gameXp || 0;
      }
    }

    return NextResponse.json({
      ok: true,
      correct,
      correctIndex: item.answer,
      explanation: item.explanation,
      bonusScore: correct ? QUIZ_BONUS_SCORE : 0,
      awardedXp,
      gameXp,
      dailyXpUsed,
      dailyXpCap: DAILY_XP_CAP
    });
  } catch (err) {
    console.error('[POST /api/student/game-quiz]', err);
    return NextResponse.json({ ok: false, message: 'ตรวจคำตอบไม่สำเร็จ' }, { status: 500 });
  }
}
