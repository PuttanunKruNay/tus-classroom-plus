import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { todayBangkokDate } from '@/lib/utils';

const DAILY_STUDENT_AI_LIMIT = 20;
const MAX_PROMPT_LENGTH = 500;

interface ChatMsg {
  sender?: string;
  role?: string;
  text?: string;
  content?: string;
}

export async function POST(req: Request) {
  const auth = await requireRole(['student', 'teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const prompt = String(body.prompt || '').trim();
    const contextLessonTitle = String(body.contextLessonTitle || '').trim();
    const toolMode = String(body.toolMode || 'student_tutor');
    const history = Array.isArray(body.history) ? (body.history as ChatMsg[]).slice(-4) : [];

    if (!prompt) {
      return NextResponse.json({ ok: false, message: 'กรุณาพิมพ์ข้อความหรือคำถามก่อนส่ง' }, { status: 400 });
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        {
          ok: false,
          message: `ข้อความยาวเกินไป (จำกัดไม่เกิน ${MAX_PROMPT_LENGTH} ตัวอักษร ตอนนี้ ${prompt.length} ตัวอักษร)`
        },
        { status: 400 }
      );
    }

    // จำกัดโควตาคำถามต่อวันสำหรับนักเรียน
    let remainingToday = DAILY_STUDENT_AI_LIMIT;
    if (auth.user.role === 'student') {
      const student = await db.getStudentById(auth.user.id);
      if (student) {
        const today = todayBangkokDate();
        const usedToday = student.dailyAiDate === today ? student.dailyAiCount || 0 : 0;
        if (usedToday >= DAILY_STUDENT_AI_LIMIT) {
          return NextResponse.json(
            {
              ok: false,
              message: `วันนี้คุณใช้โควตาถาม AI ครบ ${DAILY_STUDENT_AI_LIMIT} ครั้งแล้ว กลับมาถามใหม่ได้พรุ่งนี้นะครับ`,
              remainingToday: 0,
              dailyLimit: DAILY_STUDENT_AI_LIMIT
            },
            { status: 429 }
          );
        }
        const nextCount = usedToday + 1;
        remainingToday = DAILY_STUDENT_AI_LIMIT - nextCount;
        await db.upsertStudent({
          ...student,
          dailyAiDate: today,
          dailyAiCount: nextCount
        });
      }
    }

    const systemPrompt =
      toolMode === 'teacher_toolkit'
        ? `คุณคือผู้ช่วยครูอัจฉริยะ (Gemini Teacher Assistant) วิชาการออกแบบและเทคโนโลยี ม.4 โรงเรียนเตรียมอุดมศึกษาภาคใต้
ตอบภาษาไทยกระชับ ชัดเจน เป็นลำดับข้อ พร้อมนำไปใช้สอน ออกข้อสอบ หรือร่างประกาศได้ทันที`
        : `คุณคือ "ฮีลใจ-บอตแสนรู้" บอตช่วยติวใจดี น่ารัก ให้กำลังใจ ประจำวิชา "การออกแบบและเทคโนโลยี" ม.4 โรงเรียนเตรียมอุดมศึกษาภาคใต้
กฎสำคัญ:
1. ตอบเฉพาะเรื่องในวิชาการออกแบบและเทคโนโลยี (ระบบทางเทคโนโลยี Input-Process-Output-Feedback, การเปลี่ยนแปลง/ผลกระทบเทคโนโลยี, วัสดุและเครื่องมือ, กลไก ไฟฟ้า อิเล็กทรอนิกส์ Arduino/วงจร, กระบวนการออกแบบเชิงวิศวกรรม 6 ขั้นตอน) และให้กำลังใจการเรียนอย่างอบอุ่น
2. ตอบสั้น กระชับ ตรงประเด็น อ่านง่ายใน 3–5 บรรทัดหรือหัวข้อย่อย พร้อมตัวอย่างใกล้ตัว
3. ห้ามเฉลยข้อสอบตรงๆ ให้ใบ้แนวคิดหรืออธิบายหลักการแทน
4. หากถามนอกวิชาหรือไม่เหมาะสม ให้ปฏิเสธอย่างสุภาพและชวนกลับเข้าบทเรียน
${contextLessonTitle ? `บทเรียนปัจจุบัน: ${contextLessonTitle}` : ''}`;

    // 1. เรียก Google Gemini รุ่นตอบเร็วพิเศษ (gemini-3.1-flash-lite-preview พร้อม thinkingLevel: MINIMAL ตอบใน ~1.4 วินาที)
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (geminiKey) {
      const contents = [
        ...history
          .filter(m => (m.text || m.content)?.trim())
          .map(m => ({
            role: m.sender === 'user' || m.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(m.text || m.content).slice(0, 360) }]
          })),
        { role: 'user', parts: [{ text: prompt }] }
      ];

      const maxOutputTokens = toolMode === 'teacher_toolkit' ? 650 : 320;
      for (const modelName of [
        'gemini-3.1-flash-lite-preview',
        'gemini-3-flash-preview',
        'gemini-flash-latest'
      ]) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(geminiKey)}`;
          const generationConfig: Record<string, unknown> = {
            maxOutputTokens,
            temperature: 0.45
          };
          if (modelName.startsWith('gemini-3')) {
            generationConfig.thinkingConfig = { thinkingLevel: 'MINIMAL' };
          }
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(7000),
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents,
              generationConfig
            })
          });

          if (res.ok) {
            const data = await res.json();
            const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (answer) {
              return NextResponse.json({
                ok: true,
                mode: 'gemini_server',
                model: modelName,
                answer,
                remainingToday,
                dailyLimit: DAILY_STUDENT_AI_LIMIT
              });
            }
          }
        } catch (err) {
          console.warn(`[AI] Gemini model ${modelName} fallback:`, err);
        }
      }
    }

    // 2. Fallback: Pollinations Live AI Proxy (พร้อม timeout 6 วินาทีเพื่อไม่ให้ค้าง)
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history
          .filter(m => (m.text || m.content)?.trim())
          .map(m => ({
            role: m.sender === 'user' || m.role === 'user' ? 'user' : 'assistant',
            content: String(m.text || m.content).slice(0, 360)
          })),
        { role: 'user', content: prompt }
      ];

      const res = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify({ model: 'openai', messages })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) {
          return NextResponse.json({
            ok: true,
            mode: 'live_fallback',
            answer: text,
            remainingToday,
            dailyLimit: DAILY_STUDENT_AI_LIMIT
          });
        }
      }
    } catch {
      // fallback to structured curriculum tutor
    }

    // 3. Built-in Offline Curriculum Assistant
    const offlineAnswer =
      toolMode === 'teacher_toolkit'
        ? `โครงร่างจากผู้ช่วยครู (โหมดสำรอง):\n\nหัวข้อ: ${prompt}\n\n1. จุดประสงค์การเรียนรู้: นักเรียนสามารถวิเคราะห์และประยุกต์ใช้ความรู้เรื่องนี้ได้อย่างเป็นระบบ\n2. ขั้นนำ (10 นาที): ชวนคิดจากเทคโนโลยีรอบตัวในโรงเรียน\n3. ขั้นสอน/ปฏิบัติ (30 นาที): แบ่งกลุ่มวิเคราะห์ Input → Process → Output → Feedback หรือลงมือร่างต้นแบบ\n4. ขั้นสรุปและประเมินผล (10 นาที): นำเสนอหน้าชั้นและสะท้อนคิด`
        : `แนวคิดสำคัญสำหรับคำถาม "${prompt}" ในวิชาการออกแบบและเทคโนโลยี:\n\n1. ลองแยกองค์ประกอบของระบบทางเทคโนโลยี 4 ส่วน ได้แก่ ตัวป้อน (Input) → กระบวนการ (Process) → ผลผลิต (Output) และข้อมูลย้อนกลับ (Feedback)\n2. หากเป็นโจทย์ออกแบบชิ้นงาน ให้ไล่ตามกระบวนการออกแบบเชิงวิศวกรรม 6 ขั้นตอน: ระบุปัญหา → รวบรวมข้อมูล → ออกแบบ → ลงมือสร้าง → ทดสอบปรับปรุง → นำเสนอ`;

    return NextResponse.json({
      ok: true,
      mode: 'offline_tutor',
      answer: offlineAnswer,
      remainingToday,
      dailyLimit: DAILY_STUDENT_AI_LIMIT
    });
  } catch (err) {
    console.error('[POST /api/ai/chat]', err);
    return NextResponse.json({ ok: false, message: 'ไม่สามารถประมวลผลคำถาม AI ได้ในขณะนี้' }, { status: 500 });
  }
}
