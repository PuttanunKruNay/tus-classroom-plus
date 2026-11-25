import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

// แปลง PCM 16-bit signed little-endian (24kHz Mono) จาก Gemini TTS เป็นไฟล์ WAV มาตรฐานที่ทุกเบราว์เซอร์เล่นได้
function pcm16ToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1): Buffer {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34); // BitsPerSample
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

export async function POST(req: Request) {
  const auth = await requireRole(['student', 'teacher', 'admin']);
  if (auth.error) return auth.error;

  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!geminiKey) {
    return NextResponse.json({ ok: false, fallback: true, message: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const rawText = String(body.text || '')
      .replace(/[*#`_~>]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 420);

    if (!rawText) {
      return NextResponse.json({ ok: false, message: 'ไม่มีข้อความสำหรับอ่านออกเสียง' }, { status: 400 });
    }

    for (const modelName of ['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts']) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(geminiKey)}`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(6000),
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Read aloud clearly in natural Thai without adding extra words:\n${rawText}`
                  }
                ]
              }
            ],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' }
                }
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

        // ถ้า Gemini ส่งมาเป็น PCM L16 ให้ห่อหัว WAV เพื่อให้ iOS Safari / Android / Desktop เล่นได้ 100%
        let outBuf: Buffer = rawBuf;
        let outMime = mimeType || 'audio/wav';
        if (mimeType.includes('L16') || mimeType.includes('pcm')) {
          const rateMatch = mimeType.match(/rate=(\d+)/);
          const rate = rateMatch ? Number(rateMatch[1]) : 24000;
          outBuf = pcm16ToWav(rawBuf, rate, 1);
          outMime = 'audio/wav';
        }

        return new NextResponse(new Uint8Array(outBuf), {
          status: 200,
          headers: {
            'Content-Type': outMime,
            'Cache-Control': 'no-store'
          }
        });
      } catch {
        // ลองโมเดลถัดไป
      }
    }

    return NextResponse.json({ ok: false, fallback: true }, { status: 502 });
  } catch (err) {
    console.error('[POST /api/ai/tts]', err);
    return NextResponse.json({ ok: false, fallback: true }, { status: 500 });
  }
}
