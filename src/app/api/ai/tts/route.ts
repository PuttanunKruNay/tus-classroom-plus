import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

// แปลง PCM 16-bit signed little-endian (24kHz Mono) เป็นไฟล์ WAV มาตรฐาน (สำหรับ fallback โหมด Studio)
function pcm16ToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1): Buffer {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// ทำความสะอาดข้อความให้ภาษาไทยอ่านลื่น ไม่สะดุด และไม่ตกคำ
function normalizeThaiSpeechText(input: string): string {
  return input
    .replace(/\*\*/g, '')
    .replace(/[*#`_~>]/g, ' ')
    .replace(/•/g, ' ')
    .replace(/→|->/g, ' ไปยัง ')
    .replace(/\s*&\s*/g, ' และ ')
    .replace(/%/g, ' เปอร์เซ็นต์ ')
    .replace(/ม\.(\d)/g, 'มัธยมศึกษาปีที่ $1')
    .replace(/\r?\n+/g, ' , ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 750);
}

// แบ่งประโยคด้วย Intl.Segmenter('th') ตัดเฉพาะขอบคำภาษาไทยแท้ๆ ห้ามตัดกลางคำเด็ดขาด!
function splitThaiChunks(text: string, maxLen = 160): string[] {
  if (!text) return [];
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let current = '';

  const pushCurrent = () => {
    const trimmed = current.trim().replace(/^[,.\s]+|[,.\s]+$/g, '');
    if (trimmed) chunks.push(trimmed);
    current = '';
  };

  // แบ่งตามวรรค/เครื่องหมายก่อน แล้วค่อยแบ่งคำด้วย Intl.Segmenter('th') ถ้ายาวเกิน maxLen
  const sentences = text.split(/(?<=[,.;!?])\s+|\s+/).filter(Boolean);
  const segmenter =
    typeof Intl !== 'undefined' && 'Segmenter' in Intl
      ? new Intl.Segmenter('th', { granularity: 'word' })
      : null;

  for (const part of sentences) {
    if (part.length > maxLen && segmenter) {
      const words = Array.from(segmenter.segment(part), s => s.segment);
      for (const w of words) {
        if ((current + w).length > maxLen && current.trim()) {
          pushCurrent();
        }
        current += w;
      }
      current += ' ';
      continue;
    }

    const candidate = current ? `${current} ${part}` : part;
    if (candidate.length > maxLen && current.trim()) {
      pushCurrent();
      current = part;
    } else {
      current = candidate;
    }
  }

  pushCurrent();
  return chunks.slice(0, 6);
}

// ตัด ID3v2 header ของชิ้น MP3 ที่ 2 เป็นต้นไป เพื่อให้ต่อไฟล์ MP3 เนียนสนิทไม่มีเสียงแคร็ก
function stripId3Header(buf: Buffer): Buffer {
  if (buf.length > 10 && buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    const size =
      ((buf[6] & 0x7f) << 21) |
      ((buf[7] & 0x7f) << 14) |
      ((buf[8] & 0x7f) << 7) |
      (buf[9] & 0x7f);
    const offset = 10 + size;
    if (offset < buf.length) return buf.subarray(offset);
  }
  return buf;
}

// ช่องทางหลัก (ฟรี 100% ไม่เสียเครดิต อ่านไว < 1 วินาที ภาษาไทยชัดไม่ตกคำ): Google Neural TTS (GTX) แบบ Parallel Chunk
async function synthesizeFreeGoogleThaiMp3(cleanText: string): Promise<Buffer | null> {
  const chunks = splitThaiChunks(cleanText, 160);
  if (chunks.length === 0) return null;

  try {
    const buffers = await Promise.all(
      chunks.map(async (chunk, idx) => {
        const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=th&ttsspeed=1&q=${encodeURIComponent(chunk)}`;
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            Accept: 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8'
          },
          signal: AbortSignal.timeout(8000)
        });
        if (!res.ok) throw new Error(`GTX HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 200) throw new Error('GTX empty audio');
        return idx === 0 ? buf : stripId3Header(buf);
      })
    );
    return Buffer.concat(buffers);
  } catch (err) {
    console.warn('[POST /api/ai/tts] Free Google Thai TTS fallback:', err);
    return null;
  }
}

// ช่องทางสำรอง (กรณีผู้ใช้เลือกโหมดเสียง Google Studio หรือช่องทางฟรีมีปัญหา)
async function synthesizeGeminiStudioWav(cleanText: string, voiceName: string): Promise<{ buf: Buffer; mime: string } | null> {
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!geminiKey) return null;

  for (const modelName of ['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts']) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(geminiKey)}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: cleanText.slice(0, 500) }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName } }
            }
          }
        })
      });
      if (!res.ok) continue;
      const data = await res.json();
      const inline = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inline?.data) continue;
      const mimeType = String(inline.mimeType || '');
      const rawBuf = Buffer.from(inline.data, 'base64');
      if (mimeType.toLowerCase().includes('l16') || mimeType.toLowerCase().includes('pcm')) {
        const rateMatch = mimeType.match(/rate=(\d+)/i);
        const rate = rateMatch ? Number(rateMatch[1]) : 24000;
        return { buf: pcm16ToWav(rawBuf, rate, 1), mime: 'audio/wav' };
      }
      return { buf: rawBuf, mime: mimeType || 'audio/wav' };
    } catch {
      // try next
    }
  }
  return null;
}

export async function POST(req: Request) {
  const auth = await requireRole(['student', 'teacher', 'admin']);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const cleanText = normalizeThaiSpeechText(String(body.text || ''));
    const engine = String(body.engine || 'free').trim(); // 'free' (default: 0 credit, <1s) | 'studio'
    const requestedVoice = String(body.voice || 'Kore').trim();
    const allowedVoices = new Set(['Kore', 'Puck', 'Aoede', 'Charon', 'Fenrir', 'Leda', 'Zephyr']);
    const voiceName = allowedVoices.has(requestedVoice) ? requestedVoice : 'Kore';

    if (!cleanText) {
      return NextResponse.json({ ok: false, message: 'ไม่มีข้อความสำหรับอ่านออกเสียง' }, { status: 400 });
    }

    // 1) ถ้าเลือกโหมดฟรีอ่านไว (ค่าเริ่มต้น — ไม่เสียเครดิตเลย อ่านภาษาไทยธรรมชาติใน < 1 วินาที)
    if (engine !== 'studio') {
      const mp3 = await synthesizeFreeGoogleThaiMp3(cleanText);
      if (mp3) {
        return new NextResponse(new Uint8Array(mp3), {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'X-TTS-Engine': 'free-thai-neural',
            'Cache-Control': 'no-store'
          }
        });
      }
    }

    // 2) โหมด Studio หรือ fallback เมื่อโหมดฟรีไม่ตอบสนอง
    const studio = await synthesizeGeminiStudioWav(cleanText, voiceName);
    if (studio) {
      return new NextResponse(new Uint8Array(studio.buf), {
        status: 200,
        headers: {
          'Content-Type': studio.mime,
          'X-TTS-Engine': 'google-ai-studio',
          'Cache-Control': 'no-store'
        }
      });
    }

    // 3) หากเลือก studio แล้วไม่ติด ให้ลองโหมดฟรีอีกครั้งก่อน fallback ไปเสียงเครื่อง
    if (engine === 'studio') {
      const mp3 = await synthesizeFreeGoogleThaiMp3(cleanText);
      if (mp3) {
        return new NextResponse(new Uint8Array(mp3), {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'X-TTS-Engine': 'free-thai-neural',
            'Cache-Control': 'no-store'
          }
        });
      }
    }

    return NextResponse.json({ ok: false, fallback: true }, { status: 502 });
  } catch (err) {
    console.error('[POST /api/ai/tts]', err);
    return NextResponse.json({ ok: false, fallback: true }, { status: 500 });
  }
}
