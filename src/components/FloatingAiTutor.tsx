'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Mic, MicOff, Volume2, VolumeX, AlertCircle, Square, Zap, Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

interface FloatingAiTutorProps {
  externalPrompt?: { text: string; lessonTitle?: string; nonce: number } | null;
  initialRemaining?: number;
  dailyLimit?: number;
}

// แสดงข้อความที่มี **ตัวหนา** ให้สวยงาม ไม่แสดงเครื่องหมาย ** ดิบๆ
function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-heading font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export function FloatingAiTutor({
  externalPrompt,
  initialRemaining = 20,
  dailyLimit = 20
}: FloatingAiTutorProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'loading_voice' | 'speaking'>('idle');
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [studioVoice, setStudioVoice] = useState<'Kore' | 'Puck'>('Kore');
  const [voiceEngine, setVoiceEngine] = useState<'gemini' | 'browser'>('gemini');
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [voiceWarning, setVoiceWarning] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'สวัสดีครับ! ผมคือผู้ช่วยสอน AI วิชาการออกแบบและเทคโนโลยี ม.4 พร้อมเสียงอ่าน Google AI Studio ภาษาไทย พิมพ์หรือแตะคำถามด่วนด้านล่างได้เลยครับ'
    }
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const audioCacheRef = useRef<Map<string, Blob>>(new Map());

  useEffect(() => {
    setRemaining(initialRemaining);
  }, [initialRemaining]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, status]);

  useEffect(() => {
    return () => {
      if (ttsAbortRef.current) ttsAbortRef.current.abort();
      if (audioRef.current) audioRef.current.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (externalPrompt?.text) {
      setOpen(true);
      void sendMessage(externalPrompt.text, externalPrompt.lessonTitle);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPrompt?.nonce]);

  function stopSpeaking() {
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.onplay = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMsgId(null);
    setStatus(prev => (prev === 'speaking' || prev === 'loading_voice' ? 'idle' : prev));
  }

  function playBlob(blob: Blob, msgId: string, fallbackText: string) {
    const url = URL.createObjectURL(blob);
    audioUrlRef.current = url;
    const audio = new Audio(url);
    audioRef.current = audio;
    setVoiceEngine('gemini');
    setSpeakingMsgId(msgId);

    audio.onplay = () => {
      setSpeakingMsgId(msgId);
      setStatus('speaking');
    };
    audio.onended = () => {
      stopSpeaking();
    };
    audio.onerror = () => {
      stopSpeaking();
      speakWithBrowserFallback(fallbackText, msgId);
    };

    void audio.play().catch(() => {
      stopSpeaking();
      speakWithBrowserFallback(fallbackText, msgId);
    });
  }

  function speakWithBrowserFallback(text: string, msgId: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceWarning('ไม่สามารถเล่นเสียงได้บนเบราว์เซอร์นี้ แต่ยังอ่านข้อความได้ตามปกติครับ');
      setSpeakingMsgId(null);
      setStatus('idle');
      return;
    }
    setVoiceEngine('browser');
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#`_~>]/g, ' ').replace(/\s+/g, ' ').trim();
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'th-TH';
    utter.rate = 1.0;
    utter.onstart = () => {
      setSpeakingMsgId(msgId);
      setStatus('speaking');
    };
    utter.onend = () => {
      setSpeakingMsgId(prev => (prev === msgId ? null : prev));
      setStatus(prev => (prev === 'speaking' ? 'idle' : prev));
    };
    utter.onerror = () => {
      setSpeakingMsgId(prev => (prev === msgId ? null : prev));
      setStatus(prev => (prev === 'speaking' ? 'idle' : prev));
    };
    window.speechSynthesis.speak(utter);
  }

  // ใช้เสียงจาก Google AI Studio (Gemini Neural TTS: /api/ai/tts) เป็นค่าเริ่มต้นทุกครั้ง + แคชไว้ฟังซ้ำทันที
  async function speakText(text: string, msgId: string) {
    stopSpeaking();
    setVoiceWarning('');
    setSpeakingMsgId(msgId);

    const cacheKey = `${studioVoice}::${msgId}`;
    const cachedBlob = audioCacheRef.current.get(cacheKey);
    if (cachedBlob) {
      playBlob(cachedBlob, msgId, text);
      return;
    }

    setStatus('loading_voice');
    const controller = new AbortController();
    ttsAbortRef.current = controller;

    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ text, voice: studioVoice })
      });

      if (controller.signal.aborted) return;

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.startsWith('audio/')) {
        const blob = await res.blob();
        if (controller.signal.aborted) return;
        audioCacheRef.current.set(cacheKey, blob);
        playBlob(blob, msgId, text);
        return;
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
    }

    if (!controller.signal.aborted) {
      setVoiceWarning('เสียง Google AI Studio กำลังหนาแน่น สลับใช้เสียงสำรองชั่วคราวครับ');
      speakWithBrowserFallback(text, msgId);
    }
  }

  async function sendMessage(textOverride?: string, lessonTitle?: string) {
    const prompt = (textOverride ?? input).trim();
    if (!prompt || status === 'thinking') return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: prompt
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!textOverride) setInput('');
    stopSpeaking();
    setStatus('thinking');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          contextLessonTitle: lessonTitle || '',
          toolMode: 'student_tutor',
          history: nextHistory.slice(-4)
        })
      });
      const data = await res.json();
      if (typeof data.remainingToday === 'number') {
        setRemaining(data.remainingToday);
      }
      const answer = data.answer || data.message || 'ขออภัย ไม่สามารถตอบคำถามได้ในขณะนี้';
      const aiMsgId = `a-${Date.now()}`;
      setMessages(prev => [...prev, { id: aiMsgId, sender: 'ai', text: answer }]);
      setStatus('idle');
      if (autoSpeak && data.ok) {
        void speakText(answer, aiMsgId);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          sender: 'ai',
          text: 'ไม่สามารถเชื่อมต่อผู้ช่วย AI ได้ชั่วคราว กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้งครับ'
        }
      ]);
      setStatus('idle');
    }
  }

  function handleToggleVoiceInput() {
    if (status === 'listening' && recognitionRef.current) {
      recognitionRef.current.stop();
      setStatus('idle');
      return;
    }

    if (typeof window === 'undefined') return;
    const SpeechRec =
      (
        window as unknown as {
          SpeechRecognition?: new () => SpeechRecognition;
          webkitSpeechRecognition?: new () => SpeechRecognition;
        }
      ).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition })
        .webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceWarning(
        'เบราว์เซอร์นี้ไม่รองรับการพูดถามด้วยเสียง (แนะนำ Chrome หรือ Edge) คุณสามารถพิมพ์คำถามด้านล่างได้ตามปกติครับ'
      );
      return;
    }

    setVoiceWarning('');
    stopSpeaking();
    const recognition = new SpeechRec();
    recognitionRef.current = recognition;
    recognition.lang = 'th-TH';
    recognition.interimResults = false;
    recognition.onstart = () => setStatus('listening');
    recognition.onend = () => setStatus(prev => (prev === 'listening' ? 'idle' : prev));
    recognition.onerror = () => {
      setStatus('idle');
      setVoiceWarning('ไม่สามารถรับเสียงจากไมโครโฟนได้ กรุณาอนุญาตการใช้ไมโครโฟนหรือพิมพ์คำถามแทนครับ');
    };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        setInput(prev => (prev ? `${prev} ${transcript}` : transcript).slice(0, 500));
      }
    };
    recognition.start();
  }

  const statusLabel =
    status === 'listening'
      ? 'กำลังฟัง…'
      : status === 'thinking'
        ? 'กำลังคิด…'
        : status === 'loading_voice'
          ? 'กำลังสร้างเสียง Google AI Studio…'
          : status === 'speaking'
            ? `กำลังอ่านคำตอบ (${voiceEngine === 'gemini' ? `Google AI Studio • ${studioVoice}` : 'เสียงสำรอง'})…`
            : `โควตาวันนี้คงเหลือ ${remaining}/${dailyLimit} ครั้ง`;

  return (
    <div className="fixed bottom-[calc(4.9rem+env(safe-area-inset-bottom))] md:bottom-5 right-3 sm:right-4 z-50">
      {open && (
        <div
          role="dialog"
          aria-label="แผงแชทผู้ช่วย AI"
          className="mb-3 w-[calc(100vw-1.5rem)] sm:w-[400px] h-[min(70dvh,540px)] tus-card overflow-hidden flex flex-col shadow-2xl border-2 border-[var(--color-primary-border)] animate-scale-pop"
        >
          {/* Header */}
          <div className="bg-[var(--color-primary)] text-white px-4 py-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-heading font-bold text-base leading-tight inline-flex items-center gap-1.5">
                <Zap className="w-4 h-4 shrink-0" />
                ผู้ช่วย AI • Google Studio Voice
              </h3>
              <p className="text-xs text-white/90 mt-0.5 font-medium truncate">{statusLabel}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setStudioVoice(v => (v === 'Kore' ? 'Puck' : 'Kore'));
                }}
                className="px-2 py-1.5 rounded-xl text-[11px] font-heading font-bold bg-white/20 text-white hover:bg-white/30 cursor-pointer transition"
                title="สลับเสียง Google AI Studio: เสียงผู้หญิง (Kore) / เสียงผู้ชาย (Puck)"
              >
                {studioVoice === 'Kore' ? 'เสียงหญิง' : 'เสียงชาย'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !autoSpeak;
                  setAutoSpeak(next);
                  if (!next) stopSpeaking();
                }}
                className={`px-2 py-1.5 rounded-xl text-xs font-heading font-bold inline-flex items-center gap-1 cursor-pointer transition ${
                  autoSpeak ? 'bg-white text-[var(--color-primary)]' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
                aria-pressed={autoSpeak}
                title="สวิตช์อ่านคำตอบอัตโนมัติ"
              >
                {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setOpen(false);
                }}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 cursor-pointer"
                aria-label="ปิดหน้าต่างผู้ช่วย AI"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {voiceWarning && (
            <div className="px-3.5 py-2 bg-[var(--color-primary-soft)] text-[var(--color-primary)] text-xs flex items-start gap-2 border-b border-[var(--border-subtle)]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{voiceWarning}</span>
            </div>
          )}

          {/* Chat history */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3 bg-[var(--bg-surface-muted)]">
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-1.5">
                {[
                  'สรุป Input-Process-Output สั้นๆ',
                  'กระบวนการออกแบบ 6 ขั้นตอนมีอะไรบ้าง',
                  'วิธีต่อ LED กับตัวต้านทานไม่ให้ขาด'
                ].map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void sendMessage(q)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-strong)] text-xs font-heading font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] cursor-pointer transition text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {messages.map(m => {
              const isThisLoading = speakingMsgId === m.id && status === 'loading_voice';
              const isThisSpeaking = speakingMsgId === m.id && status === 'speaking';
              return (
                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.sender === 'user'
                        ? 'bg-[var(--color-primary)] text-white rounded-br-sm'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-bl-sm'
                    }`}
                  >
                    {m.sender === 'ai' ? renderFormattedText(m.text) : m.text}
                    {m.sender === 'ai' && (
                      <div className="mt-2 pt-1.5 border-t border-[var(--border-subtle)] flex items-center gap-3">
                        {isThisLoading ? (
                          <span className="text-xs font-heading font-semibold text-[var(--color-primary)] inline-flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังสร้างเสียง Google Studio…
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void speakText(m.text, m.id)}
                            className="text-xs font-heading font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                            aria-label="ฟังเสียงอ่าน AI"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            {isThisSpeaking ? 'กำลังอ่าน…' : 'ฟังเสียง AI'}
                          </button>
                        )}
                        {(isThisSpeaking || isThisLoading) && (
                          <button
                            type="button"
                            onClick={stopSpeaking}
                            className="text-xs font-semibold text-[var(--color-danger)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Square className="w-3 h-3 fill-current" /> หยุดอ่าน
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {status === 'thinking' && (
              <div className="flex justify-start">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl px-4 py-2.5 text-sm text-[var(--color-primary)] font-semibold animate-pulse">
                  กำลังคิด…
                </div>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={e => {
              e.preventDefault();
              void sendMessage();
            }}
            className="p-3 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleVoiceInput}
                className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center shrink-0 cursor-pointer transition ${
                  status === 'listening'
                    ? 'bg-[var(--color-danger)] text-white border-[var(--color-danger)] animate-pulse'
                    : 'bg-[var(--bg-surface-muted)] text-[var(--color-primary)] border-[var(--border-strong)] hover:bg-[var(--color-primary-soft)]'
                }`}
                aria-label={status === 'listening' ? 'หยุดฟังเสียง' : 'พูดถามด้วยเสียงภาษาไทย'}
                title="พูดถามด้วยเสียงภาษาไทย"
              >
                {status === 'listening' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <input
                type="text"
                maxLength={500}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={status === 'listening' ? 'กำลังฟังเสียงของคุณ…' : 'พิมพ์คำถามเรื่องบทเรียน...'}
                className="tus-input !min-h-[44px] !py-2 !text-base sm:!text-sm"
              />
              <button
                type="submit"
                disabled={status === 'thinking' || !input.trim() || remaining <= 0}
                className="w-11 h-11 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
                aria-label="ส่งคำถาม"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-between text-xs text-[var(--text-muted)] px-1">
              <span>{input.length}/500 ตัวอักษร</span>
              <span>Google AI Studio Voice ({studioVoice})</span>
            </div>
          </form>
        </div>
      )}

      {/* ปุ่มไอคอนกลมมุมล่างขวา */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-15 h-15 rounded-full bg-[var(--color-primary)] text-white shadow-xl border-2 border-white border-b-4 border-b-[var(--color-primary-shadow)] active:translate-y-1 transition flex items-center justify-center cursor-pointer"
        aria-label={open ? 'ปิดผู้ช่วย AI' : 'เปิดผู้ช่วย AI'}
        title="ผู้ช่วย AI + เสียง Google AI Studio"
      >
        {open ? <X className="w-7 h-7" /> : <Bot className="w-7 h-7" />}
      </button>
    </div>
  );
}

interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
}
