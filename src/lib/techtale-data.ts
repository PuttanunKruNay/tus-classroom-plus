export type TechTaleComponentType =
  | 'led'
  | 'dimmerLED'
  | 'fan'
  | 'pump'
  | 'buzzer'
  | 'trafficLight'
  | 'buttonLamp'
  | 'sirenLED'
  | 'lightSensor'
  | 'soilStation'
  | 'alarmSystem';

export type TechTaleLevelId = 'primary' | 'middle' | 'high';

export interface TechTaleLevelMeta {
  id: TechTaleLevelId;
  title: string;
  subtitle: string;
  color: string;
  badgeBg: string;
}

export const TECHTALE_LEVELS: TechTaleLevelMeta[] = [
  {
    id: 'primary',
    title: 'ประถม',
    subtitle: 'พื้นฐาน: ต่อสาย SIGNAL/GND และเติมคำสั่ง HIGH/LOW',
    color: '#16A34A',
    badgeBg: 'rgba(22, 163, 74, 0.14)'
  },
  {
    id: 'middle',
    title: 'มัธยมต้น',
    subtitle: 'ต่อหลายขั้ว • delay, if/else, อ่านปุ่มและเซนเซอร์',
    color: '#EA580C',
    badgeBg: 'rgba(234, 88, 12, 0.14)'
  },
  {
    id: 'high',
    title: 'มัธยมปลาย',
    subtitle: 'ทรานซิสเตอร์/รีเลย์ • PWM, ฟังก์ชัน, for, millis()',
    color: '#9333EA',
    badgeBg: 'rgba(147, 51, 234, 0.14)'
  }
];

export interface CharacterProfile {
  id: string;
  name: string;
  emoji: string;
  roleColor: string;
}

export const CHARACTER_REGISTRY: Record<string, CharacterProfile> = {
  uncle: { id: 'uncle', name: 'ลุงช่างสมเกียรติ', emoji: '🔧', roleColor: '#EA580C' },
  mentor: { id: 'mentor', name: 'พี่นีโอ (วิศวกรซูเปอร์เทค)', emoji: '👨‍💻', roleColor: '#2563EB' },
  dog: { id: 'dog', name: 'สปาร์กี้ (ไซเบอร์ด็อก)', emoji: '🐶', roleColor: '#92400E' },
  aunt: { id: 'aunt', name: 'ป้าพฤกษา (ผู้ดูแลดาวอังคาร)', emoji: '🌿', roleColor: '#16A34A' },
  officer: { id: 'officer', name: 'ผู้บัญชาการเรด', emoji: '🛡️', roleColor: '#DC2626' },
  aria: { id: 'aria', name: 'อาเรีย (AI ประจำยาน)', emoji: '🤖', roleColor: '#9333EA' },
  luna: { id: 'luna', name: 'กัปตันลูน่า', emoji: '🌟', roleColor: '#B8194F' }
};

export interface DialogueLine {
  characterId: string;
  text: string;
  sceneImage?: string;
}

export type CodeBlock = { kind: 'text'; value: string } | { kind: 'blank'; id: number };

export interface GlossaryEntry {
  title: string;
  desc: string;
  color: string;
}

export interface CodingTask {
  instruction: string;
  codeTemplate: CodeBlock[];
  correctAnswers: string[];
  options: string[];
  glossary?: Record<string, GlossaryEntry>;
}

export interface TerminalSpec {
  id: string;
  label: string;
  expectedPin: string;
  color: string;
}

export interface PartSpec {
  id: string;
  name: string;
  icon: string;
  missingMessage: string;
  isDangerous?: boolean;
  extraMessage: string;
  inlineTerminal?: string;
}

export interface TechTaleMission {
  key: string;
  level: TechTaleLevelId;
  title: string;
  description: string;
  moduleColor: string;
  cardImage?: string;
  componentType: TechTaleComponentType;
  dialogues: DialogueLine[];
  endingDialogues: DialogueLine[];
  terminals: TerminalSpec[];
  parts: PartSpec[];
  requiredPartIds: string[];
  targetComponentTitle: string;
  codingTask: CodingTask;
  successMessage: string;
  failureMessage: string;
}

export const BOARD_PINS_LOGICAL = [
  '13', '12', '11', '10', '9', '8', '7',
  '6', '5', '4', '3', 'A0', 'VCC', 'GND'
];

export function formatBoardPinLabel(pin: string, boardType: 'Arduino' | 'ESP32'): string {
  if (pin === 'VCC') return boardType === 'ESP32' ? '3V3' : '5V';
  if (pin === 'GND' || pin.startsWith('A')) return pin;
  return boardType === 'ESP32' ? `D${pin}` : pin;
}

export function formatBoardPinDisplay(pin: string, boardType: 'Arduino' | 'ESP32'): string {
  if (pin === 'GND' || pin === 'VCC') return formatBoardPinLabel(pin, boardType);
  return `พิน ${formatBoardPinLabel(pin, boardType)}`;
}

// Reusable terminal & part builders
const sig = (pin: string, id = 'SIGNAL', label = 'SIGNAL', color = '#EF4444'): TerminalSpec => ({
  id,
  label,
  expectedPin: pin,
  color
});
const GND_TERM: TerminalSpec = { id: 'GND', label: 'GND', expectedPin: 'GND', color: '#1F2937' };
const VCC_TERM: TerminalSpec = { id: 'VCC', label: 'VCC', expectedPin: 'VCC', color: '#F97316' };

const partR220 = (inlineTerminal?: string): PartSpec => ({
  id: 'r220',
  name: 'Resistor 220Ω',
  icon: '⚡',
  missingMessage: '💥 ตู้ม! กระแสไฟเกิน อุปกรณ์พังเพราะลืมใส่ Resistor 220Ω!',
  isDangerous: true,
  extraMessage: 'วงจรนี้ไม่ต้องใช้ Resistor 220Ω',
  inlineTerminal
});
const PART_R1K: PartSpec = {
  id: 'r1k',
  name: 'Resistor 1kΩ (ขาเบส)',
  icon: '〰️',
  missingMessage: '💥 กระแสเข้าขาเบสมากเกิน ทรานซิสเตอร์ร้อนจัดและพัง! ต้องมี Resistor 1kΩ ที่ขาเบส',
  isDangerous: true,
  extraMessage: 'วงจรนี้ไม่ต้องใช้ Resistor 1kΩ'
};
const PART_R10K: PartSpec = {
  id: 'r10k',
  name: 'Resistor 10kΩ (แบ่งแรงดัน)',
  icon: '➗',
  missingMessage: 'LDR ต้องมี Resistor 10kΩ ต่อเป็นตัวแบ่งแรงดัน ไม่งั้นอ่านค่าแสงไม่ได้',
  extraMessage: 'วงจรนี้ไม่ต้องใช้ Resistor 10kΩ'
};
const PART_TRANSISTOR: PartSpec = {
  id: 'transistor',
  name: 'ทรานซิสเตอร์ NPN',
  icon: '🔲',
  missingMessage: 'พินบอร์ดจ่ายกระแสให้มอเตอร์ไม่พอ ต้องมีทรานซิสเตอร์ช่วยขยายกระแส',
  extraMessage: 'วงจรนี้ไม่ต้องใช้ทรานซิสเตอร์'
};
const PART_DIODE: PartSpec = {
  id: 'diode',
  name: 'ไดโอด (Flyback)',
  icon: '▶️',
  missingMessage: '💥 มอเตอร์ย้อนแรงดันสูงกลับมาทำลายทรานซิสเตอร์! ต้องมีไดโอดคร่อมมอเตอร์',
  isDangerous: true,
  extraMessage: 'วงจรนี้ไม่ต้องใช้ไดโอด Flyback'
};
const PART_RELAY: PartSpec = {
  id: 'relay',
  name: 'โมดูลรีเลย์',
  icon: '🎛️',
  missingMessage: 'ปั๊มน้ำกินกระแสมาก ต้องสั่งงานผ่านโมดูลรีเลย์',
  extraMessage: 'วงจรนี้ไม่ต้องใช้โมดูลรีเลย์'
};
const PART_CAPACITOR: PartSpec = {
  id: 'cap',
  name: 'ตัวเก็บประจุ 100µF',
  icon: '🔋',
  missingMessage: 'ยังขาดตัวเก็บประจุ',
  extraMessage: 'ตัวเก็บประจุใช้กรองสัญญาณรบกวน ไม่จำเป็นในวงจรนี้ ลองเอาออกดูนะ!'
};
const PART_PULLDOWN: PartSpec = {
  id: 'pulldown',
  name: 'Resistor 10kΩ (Pull-down)',
  icon: '⬇️',
  missingMessage: 'ยังขาด Resistor Pull-down',
  extraMessage: 'เราใช้ INPUT_PULLUP แล้ว บอร์ดมีตัวต้านทานภายในให้ ไม่ต้องใส่เพิ่ม!'
};

export const CODE_GLOSSARY: Record<string, GlossaryEntry> = {
  '13': { title: 'พิน 13 (Pin 13)', desc: 'พินดิจิทัลขาออก เหมาะสำหรับต่อ LED หรือไฟสัญญาณ', color: '#F97316' },
  '8': { title: 'พิน 8 (Pin 8)', desc: 'พินสัญญาณที่ใช้สั่งงานพัดลมระบายความร้อน', color: '#06B6D4' },
  '10': { title: 'พิน 10 (Pin 10)', desc: 'พินสัญญาณสำหรับสั่งการโมดูลปั๊มน้ำ', color: '#3B82F6' },
  '5': { title: 'พิน 5 (Pin 5)', desc: 'พินที่รองรับ PWM ใช้ส่งคลื่นความถี่ให้ Buzzer', color: '#A855F7' },
  '9': { title: 'พิน 9 (Pin 9)', desc: 'พินที่รองรับ PWM (มีสัญลักษณ์ ~ บน UNO) ใช้ analogWrite ได้', color: '#10B981' },
  '6': { title: 'พิน 6 (Pin 6)', desc: 'พิน PWM ใช้ปรับความเร็วมอเตอร์ได้', color: '#14B8A6' },
  '7': { title: 'พิน 7 (Pin 7)', desc: 'พินดิจิทัลสำหรับอ่านค่าปุ่มกด', color: '#3B82F6' },
  A0: { title: 'พิน A0 (Analog 0)', desc: 'พินอนาล็อกขาเข้า อ่านค่าละเอียด 0–1023 ใช้กับเซนเซอร์', color: '#6366F1' },
  HIGH: { title: 'HIGH (เปิด)', desc: 'จ่ายไฟระดับสูง (5V บน UNO / 3.3V บน ESP32) เพื่อเปิดอุปกรณ์', color: '#22C55E' },
  LOW: { title: 'LOW (ปิด / 0V)', desc: 'ตัดไฟ เพื่อสั่งดับหรือหยุดอุปกรณ์', color: '#EF4444' },
  OUTPUT: { title: 'OUTPUT (โหมดส่งออก)', desc: 'ให้พินทำหน้าที่ส่งสัญญาณออกไปยังอุปกรณ์', color: '#EAB308' },
  INPUT: { title: 'INPUT (โหมดรับเข้า)', desc: 'ให้พินทำหน้าที่รับสัญญาณจากภายนอก เช่น ปุ่มกด', color: '#9CA3AF' },
  INPUT_PULLUP: {
    title: 'INPUT_PULLUP',
    desc: 'รับเข้าพร้อมตัวต้านทานภายใน ปุ่มไม่กด = HIGH และเมื่อกด = LOW',
    color: '#10B981'
  },
  '1000': { title: '1000 Hz (ความถี่เสียง)', desc: 'ความถี่ 1000 เฮิรตซ์ ได้เสียงหวอเตือนภัยที่ชัดเจน', color: '#EC4899' },
  '800': { title: '800 Hz', desc: 'เสียงต่ำ สลับกับเสียงสูงเพื่อทำเสียงไซเรน', color: '#EC4899' },
  '1200': { title: '1200 Hz', desc: 'เสียงสูง สลับกับเสียงต่ำเพื่อทำเสียงไซเรน', color: '#EC4899' },
  '300': { title: '300 ms', desc: 'หน่วงเวลา 0.3 วินาทีต่อหนึ่งจังหวะ', color: '#F97316' },
  '2000': { title: '2000 ms (2 วินาที)', desc: 'delay() ใช้หน่วยมิลลิวินาที 1000 ms = 1 วินาที', color: '#F97316' },
  '3000': { title: '3000 ms (3 วินาที)', desc: 'delay() ใช้หน่วยมิลลิวินาที 1000 ms = 1 วินาที', color: '#F97316' },
  '0': { title: 'ค่า 0', desc: 'ค่าต่ำสุดของ analogWrite = ดับ/หยุดสนิท', color: '#9CA3AF' },
  '255': { title: '255 (สูงสุด)', desc: 'ค่าสูงสุดของ analogWrite (สว่าง/เร็วสุด 100%)', color: '#EAB308' },
  '1023': { title: '1023 ❌', desc: 'นี่คือค่าสูงสุดของ analogRead ไม่ใช่ analogWrite (ต้องไม่เกิน 255)', color: '#EF4444' },
  '200': { title: '200 (≈78%)', desc: 'ความเร็วประมาณ 78% ของกำลังสูงสุด (200 ÷ 255)', color: '#22C55E' },
  '500': { title: '500 ❌', desc: 'เกินช่วง 0–255 ของ analogWrite จะทำงานผิดพลาด', color: '#EF4444' },
  '400': { title: '400 (ค่าเกณฑ์)', desc: 'ค่าเปรียบเทียบ ถ้าค่าที่อ่านได้ต่ำกว่านี้ถือว่า มืด/แห้ง (จาก 0–1023)', color: '#F97316' },
  '900': { title: '900 ❌', desc: 'สูงมาก = สว่างจัด ถ้าตั้งเกณฑ์นี้ ไฟจะติดทั้งที่ยังสว่างอยู่', color: '#EF4444' },
  s: { title: 's (พารามิเตอร์)', desc: 'ตัวแปรที่รับค่าเข้ามาในฟังก์ชัน setFanSpeed(int s)', color: '#06B6D4' },
  speedLevel: { title: 'speedLevel (ตัวแปร)', desc: 'ตัวแปรเก็บระดับความเร็ว ส่งเข้าฟังก์ชันตอนเรียกใช้', color: '#22C55E' },
  analogRead: { title: 'analogRead()', desc: 'อ่านค่าอนาล็อก 0–1023 จากพิน เช่น เซนเซอร์ความชื้น', color: '#6366F1' },
  digitalRead: { title: 'digitalRead()', desc: 'อ่านได้แค่ HIGH/LOW ใช้กับปุ่มกด ไม่ละเอียดพอสำหรับเซนเซอร์ ❌', color: '#9CA3AF' },
  '<': { title: '< (น้อยกว่า)', desc: 'เงื่อนไขเป็นจริงเมื่อค่าทางซ้ายน้อยกว่าค่าทางขวา', color: '#F97316' },
  '>': { title: '> (มากกว่า)', desc: 'เงื่อนไขเป็นจริงเมื่อค่าทางซ้ายมากกว่าค่าทางขวา', color: '#F97316' },
  true: { title: 'true (จริง)', desc: 'ค่าตรรกะ จริง ใช้กับตัวแปรชนิด bool', color: '#22C55E' },
  false: { title: 'false (เท็จ)', desc: 'ค่าตรรกะ เท็จ ใช้กับตัวแปรชนิด bool', color: '#EF4444' },
  'millis()': { title: 'millis()', desc: 'คืนเวลา (ms) ตั้งแต่บอร์ดเริ่มทำงาน ใช้จับเวลาโดยไม่ต้องหยุดรอ', color: '#06B6D4' },
  'delay(500)': { title: 'delay(500) ❌', desc: 'หยุดบอร์ดทั้งตัว 0.5 วิ ทำให้ปุ่มไม่ตอบสนอง ไม่เหมาะกับโค้ดนี้', color: '#EF4444' },
  '!ledState': { title: '!ledState', desc: 'กลับค่า true↔false ทำให้ไฟสลับติด/ดับทุกครั้งที่ถึงเวลา', color: '#EC4899' },
  ledState: { title: 'ledState', desc: 'ถ้าใช้ค่าเดิมซ้ำ ค่าจะไม่เปลี่ยน ไฟจึงไม่กะพริบ', color: '#9CA3AF' }
};

export const TECHTALE_MISSIONS: TechTaleMission[] = [
  // ─────────── ประถม (p1–p4) ───────────
  {
    key: 'p1',
    level: 'primary',
    title: 'บทที่ 1: แสงสว่างพรมแดนอวกาศ',
    description: 'พายุสุริยะพัดจนประตูด่านตรวจอวกาศดับมืด! ต่อสายไฟ LED เพื่อกู้ระบบแสงสว่าง',
    moduleColor: '#EAB308',
    cardImage: '/techtale/card_p1.jpg',
    componentType: 'led',
    dialogues: [
      {
        characterId: 'uncle',
        text: 'แย่แล้ว! พายุสุริยะพัดระบบไฟของประตูด่านตรวจพังหมดเลย! มืดจนมองไม่เห็นยานลักลอบแล้ว!',
        sceneImage: '/techtale/on1.png'
      },
      {
        characterId: 'mentor',
        text: 'ฉุกเฉิน! นีโอกำลังเปิดระบบสำรอง ลากสายไฟสัญญาณไปที่ขา 13 และขั้วลบลง GND และห้ามลืมใส่ Resistor กันกระแสไฟเกินเด็ดขาด!'
      }
    ],
    endingDialogues: [
      {
        characterId: 'officer',
        text: 'สถานการณ์ปลอดภัย! แสงสว่างกลับมาแล้ว มองเห็นยานทุกลำชัดเจนเลย ทำได้ดีมาก!',
        sceneImage: '/techtale/end1.png'
      }
    ],
    terminals: [sig('13'), GND_TERM],
    parts: [partR220('SIGNAL')],
    requiredPartIds: ['r220'],
    targetComponentTitle: 'LED',
    codingTask: {
      instruction: 'ป้อนคำสั่งเปิดไฟสัญญาณ HIGH ที่ขา 13',
      codeTemplate: [
        { kind: 'text', value: 'void setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(' },
        { kind: 'blank', id: 0 },
        { kind: 'text', value: ', ' },
        { kind: 'blank', id: 1 },
        { kind: 'text', value: ');\n}' }
      ],
      correctAnswers: ['13', 'HIGH'],
      options: ['13', '8', 'HIGH', 'LOW', 'INPUT']
    },
    successMessage: 'สำเร็จ! สปอตไลท์พรมแดนสว่างไสว ยานตรวจการปลอดภัยแล้ว!',
    failureMessage: 'วงจรยังไม่สมบูรณ์ เช็คสาย 13, GND และการใส่ Resistor'
  },
  {
    key: 'p2',
    level: 'primary',
    title: 'บทที่ 2: วิกฤตห้องเครื่องความร้อนสูง',
    description: 'ความร้อนยาน Tech-1 ทะลุ 100°C! ต้องเปิดพัดลมระบายความร้อนด่วนก่อนเครื่องระเบิด',
    moduleColor: '#06B6D4',
    cardImage: '/techtale/card_p2.jpg',
    componentType: 'fan',
    dialogues: [
      { characterId: 'dog', text: 'โฮ่งๆ! ร้อนมากๆ เลยฮะ เตาปฏิกรณ์ห้องเครื่องจะตู้มแล้ววว!' },
      { characterId: 'mentor', text: 'เร่งด่วน! เชื่อมต่อสายพัดลมเข้าพิน 8 และ GND สั่งหมุนพัดลมเพื่อลดอุณหภูมิห้องเครื่องทันที!' }
    ],
    endingDialogues: [
      { characterId: 'dog', text: 'โฮ่งๆ! ห้องเครื่องเย็นลงแล้วฮะ สบายตัวขึ้นเยอะเลย!' },
      {
        characterId: 'mentor',
        text: 'ดีมาก! ระบบระบายความร้อนกลับมาเสถียรแล้ว เกร็ดความรู้: ของจริงต้องต่อมอเตอร์ผ่านทรานซิสเตอร์หรือรีเลย์นะ เพราะพินบอร์ดจ่ายกระแสได้น้อย'
      }
    ],
    terminals: [sig('8'), GND_TERM],
    parts: [],
    requiredPartIds: [],
    targetComponentTitle: 'MOTOR FAN',
    codingTask: {
      instruction: 'ตั้งค่าพิน 8 เป็น OUTPUT แล้วจ่ายไฟ HIGH เปิดพัดลม',
      codeTemplate: [
        { kind: 'text', value: 'void setup() {\n  pinMode(8, ' },
        { kind: 'blank', id: 0 },
        { kind: 'text', value: ');\n}\n\nvoid loop() {\n  digitalWrite(8, ' },
        { kind: 'blank', id: 1 },
        { kind: 'text', value: ');\n}' }
      ],
      correctAnswers: ['OUTPUT', 'HIGH'],
      options: ['INPUT', 'OUTPUT', 'HIGH', 'LOW', '8']
    },
    successMessage: 'เยี่ยมยอด! พัดลมหมุนฟึ่บ! อุณหภูมิกลับสู่ระดับปลอดภัย',
    failureMessage: 'พัดลมยังไม่หมุน เช็คสายพิน 8 และ GND'
  },
  {
    key: 'p3',
    level: 'primary',
    title: 'บทที่ 3: กู้ชีพเรือนกระจกดาวอังคาร',
    description: 'แปลงผักกลางทะเลทรายอังคารกำลังเหี่ยวแห้ง สั่งการปั๊มน้ำดึงน้ำใต้ดินขึ้นมารดผัก',
    moduleColor: '#16A34A',
    componentType: 'pump',
    dialogues: [
      { characterId: 'aunt', text: 'พืชพันธุ์อวกาศกำลังจะตายใน 3 นาที! หากไม่มีน้ำ เสบียงพวกเราหมดแน่!' },
      { characterId: 'mentor', text: 'ต่อสายควบคุมปั๊มน้ำเข้าที่พิน 10 และ GND เปิดระบบสูบน้ำใต้ดินขึ้นมาด่วน!' }
    ],
    endingDialogues: [
      { characterId: 'aunt', text: 'โอ้โห! น้ำพุ่งขึ้นมาเต็มเลย พืชพันธุ์ของเรารอดตายแล้วจ้ะ มีผักกินแล้วพวกเรา!' }
    ],
    terminals: [sig('10'), GND_TERM],
    parts: [],
    requiredPartIds: [],
    targetComponentTitle: 'WATER PUMP',
    codingTask: {
      instruction: 'สั่งเปิดปั๊มน้ำแรงดันสูงที่พิน 10',
      codeTemplate: [
        { kind: 'text', value: 'void setup() {\n  pinMode(10, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(' },
        { kind: 'blank', id: 0 },
        { kind: 'text', value: ', ' },
        { kind: 'blank', id: 1 },
        { kind: 'text', value: ');\n}' }
      ],
      correctAnswers: ['10', 'HIGH'],
      options: ['10', '13', 'HIGH', 'LOW', 'OUTPUT']
    },
    successMessage: 'สุดยอด! น้ำพุ่งฉีดรดแปลงผัก พืชพันธุ์กลับมาเขียวขจี!',
    failureMessage: 'ปั๊มยังไม่ทำงาน เช็คสายพิน 10 และ GND'
  },
  {
    key: 'p4',
    level: 'primary',
    title: 'บทที่ 4: สัญญาณอุกกาบาตชนฐาน',
    description: 'ตรวจพบฝูงอุกกาบาตมุ่งหน้าสู่ฐาน! ต่อสัญญาณ Buzzer ส่งเสียงหวอเตือนภัย นำทุกคนอพยพ',
    moduleColor: '#DC2626',
    componentType: 'buzzer',
    dialogues: [
      { characterId: 'officer', text: 'เรดอเลิร์ต! อุกกาบาตขนาดใหญ่กำลังพุ่งชนฐานวิจัยในอีก 1 นาที!' },
      { characterId: 'mentor', text: 'ต่อ Buzzer สัญญาณเตือนเข้าพิน 5 และ GND แล้วใช้ฟังก์ชัน tone() สร้างเสียงหวอความถี่ 1000Hz ด่วน!' }
    ],
    endingDialogues: [
      { characterId: 'officer', text: 'ทุกคนอพยพทันเวลาพอดี! ระบบเตือนภัยของคุณช่วยชีวิตพวกเราไว้' },
      { characterId: 'mentor', text: 'ภารกิจสำเร็จอย่างงดงาม! คุณพร้อมจะก้าวไปสู่ระดับต่อไปแล้ว' }
    ],
    terminals: [sig('5'), GND_TERM],
    parts: [],
    requiredPartIds: [],
    targetComponentTitle: 'BUZZER',
    codingTask: {
      instruction: 'สร้างคลื่นเสียงฉุกเฉินความถี่ 1000Hz ที่พิน 5',
      codeTemplate: [
        { kind: 'text', value: 'void loop() {\n  // ส่งเสียงเตือนภัย 1000Hz\n  tone(' },
        { kind: 'blank', id: 0 },
        { kind: 'text', value: ', ' },
        { kind: 'blank', id: 1 },
        { kind: 'text', value: ');\n}' }
      ],
      correctAnswers: ['5', '1000'],
      options: ['5', '13', '1000', 'HIGH', 'LOW']
    },
    successMessage: 'หวี้หว่อ! เสียงไซเรนเตือนภัยดังกระหึ่ม ทุกคนอพยพทันเวลา!',
    failureMessage: 'ไม่มีเสียงเตือน เช็คสายพิน 5 และ GND'
  },

  // ─────────── มัธยมต้น (m1–m4) ───────────
  {
    key: 'm1',
    level: 'middle',
    title: 'บทที่ 1: ไฟจราจรสถานีอวกาศ',
    description: 'ระบบจราจรยานขนส่งล่ม! ต่อ LED 3 สีและใช้ delay() ตั้งจังหวะไฟแดง-เหลือง-เขียว',
    moduleColor: '#EA580C',
    componentType: 'trafficLight',
    dialogues: [
      { characterId: 'aria', text: 'คำเตือน! ระบบควบคุมการจราจรของสถานีอวกาศล่มทั้งหมด ยานขนส่งกำลังจะชนกัน!' },
      {
        characterId: 'mentor',
        text: 'ถึงเวลาอัปเกรดแล้ว! ต่อ LED 3 สี แดง-เหลือง-เขียว เข้าพิน 13, 12, 11 และ GND อย่าลืมใส่ Resistor แล้วใช้ delay() ตั้งเวลาให้ไฟเปลี่ยนตามจังหวะ! ระวังชิ้นส่วนที่ไม่จำเป็นด้วยนะ'
      }
    ],
    endingDialogues: [
      { characterId: 'luna', text: 'ยอดเยี่ยม! ยานทุกลำเข้าคิวเป็นระเบียบแล้ว ไม่มีการชนกันอีกต่อไป' },
      { characterId: 'mentor', text: 'เกร็ดความรู้: delay() ใช้หน่วยมิลลิวินาที 1000 ms = 1 วินาที และระหว่าง delay บอร์ดจะหยุดรอ ทำอย่างอื่นไม่ได้เลย!' }
    ],
    terminals: [
      sig('13', 'RED', 'RED', '#EF4444'),
      sig('12', 'YELLOW', 'YELLOW', '#EAB308'),
      sig('11', 'GREEN', 'GREEN', '#22C55E'),
      GND_TERM
    ],
    parts: [partR220(), PART_CAPACITOR],
    requiredPartIds: ['r220'],
    targetComponentTitle: 'TRAFFIC LIGHT',
    codingTask: {
      instruction: 'ตั้งจังหวะไฟ: แดง 3 วิ → เหลือง 1 วิ → เขียว 2 วิ (delay ใช้หน่วย ms)',
      codeTemplate: [
        {
          kind: 'text',
          value:
            'void setup() {\n  pinMode(13, OUTPUT);\n  pinMode(12, OUTPUT);\n  pinMode(11, OUTPUT);\n}\n\nvoid loop() {\n  // แดง 3 วินาที\n  digitalWrite(13, HIGH);\n  delay(3000);\n  // เหลือง 1 วินาที\n  digitalWrite(13, '
        },
        { kind: 'blank', id: 0 },
        { kind: 'text', value: ');\n  digitalWrite(12, ' },
        { kind: 'blank', id: 1 },
        { kind: 'text', value: ');\n  delay(' },
        { kind: 'blank', id: 2 },
        { kind: 'text', value: ');\n  // เขียว 2 วินาที\n  digitalWrite(12, LOW);\n  digitalWrite(11, HIGH);\n  delay(2000);\n  digitalWrite(11, ' },
        { kind: 'blank', id: 3 },
        { kind: 'text', value: ');\n}' }
      ],
      correctAnswers: ['LOW', 'HIGH', '1000', 'LOW'],
      options: ['LOW', 'HIGH', '1000', '2000', '3000', 'OUTPUT'],
      glossary: {
        '1000': { title: '1000 ms = 1 วินาที', desc: 'delay(1000) หยุดรอ 1 วินาที เหมาะกับไฟเหลืองสั้นๆ', color: '#F97316' }
      }
    },
    successMessage: 'สำเร็จ! ไฟจราจรเปลี่ยนสีตามจังหวะ ยานทุกลำเข้าคิวเรียบร้อย!',
    failureMessage: 'เช็คสาย RED/YELLOW/GREEN, GND และ Resistor'
  },
  {
    key: 'm2',
    level: 'middle',
    title: 'บทที่ 2: ประตูสแกนมือโรงเก็บยาน',
    description: 'ปุ่มสแกนมือยังไม่ต่อกับระบบ! เรียนรู้การอ่านค่าปุ่มกดด้วย digitalRead และ if/else',
    moduleColor: '#2563EB',
    componentType: 'buttonLamp',
    dialogues: [
      { characterId: 'luna', text: 'ประตูโรงเก็บยานต้องกดปุ่มสแกนถึงจะเปิด แต่ปุ่มยังไม่ถูกต่อเข้ากับระบบเลย!' },
      {
        characterId: 'mentor',
        text: 'คราวนี้เราจะรับค่าจากโลกภายนอก! ต่อปุ่มกดเข้าพิน 7, LED เข้าพิน 13 และ GND เราจะใช้โหมด INPUT_PULLUP จึงไม่ต้องใส่ Resistor เพิ่มที่ปุ่ม แต่ LED ยังต้องมี Resistor นะ!'
      }
    ],
    endingDialogues: [
      { characterId: 'luna', text: 'ประตูเปิดแล้ว! ยานเข้าโรงเก็บได้อย่างปลอดภัย' },
      { characterId: 'mentor', text: 'จำไว้นะ: เมื่อใช้ INPUT_PULLUP ปุ่มที่ถูกกดจะอ่านค่าได้ LOW (กลับกับที่หลายคนคิด)' }
    ],
    terminals: [sig('7', 'BUTTON', 'BUTTON', '#3B82F6'), sig('13', 'LED', 'LED', '#EF4444'), GND_TERM],
    parts: [partR220(), PART_PULLDOWN],
    requiredPartIds: ['r220'],
    targetComponentTitle: 'BUTTON + LED',
    codingTask: {
      instruction: 'ตั้งปุ่มพิน 7 เป็น INPUT_PULLUP — เมื่อกดปุ่ม (อ่านได้ LOW) ให้ไฟพิน 13 ติด',
      codeTemplate: [
        { kind: 'text', value: 'void setup() {\n  pinMode(7, ' },
        { kind: 'blank', id: 0 },
        { kind: 'text', value: ');\n  pinMode(13, ' },
        { kind: 'blank', id: 1 },
        { kind: 'text', value: ');\n}\n\nvoid loop() {\n  if (digitalRead(7) == ' },
        { kind: 'blank', id: 2 },
        { kind: 'text', value: ') {\n    digitalWrite(13, ' },
        { kind: 'blank', id: 3 },
        { kind: 'text', value: ');\n  } else {\n    digitalWrite(13, LOW);\n  }\n}' }
      ],
      correctAnswers: ['INPUT_PULLUP', 'OUTPUT', 'LOW', 'HIGH'],
      options: ['INPUT', 'INPUT_PULLUP', 'OUTPUT', 'HIGH', 'LOW', '7']
    },
    successMessage: 'สำเร็จ! กดปุ่มแล้วไฟติด ประตูโรงเก็บยานเปิดแล้ว!',
    failureMessage: 'เช็คสาย BUTTON, LED, GND และ Resistor'
  },
  {
    key: 'm3',
    level: 'middle',
    title: 'บทที่ 3: ไซเรนตำรวจอวกาศ',
    description: 'ยานแปลกปลอมบุกน่านฟ้า! สร้างไซเรนแสง-เสียงสลับความถี่เหมือนตำรวจอวกาศ',
    moduleColor: '#DC2626',
    componentType: 'sirenLED',
    dialogues: [
      { characterId: 'officer', text: 'พบยานแปลกปลอมบุกรุกน่านฟ้า! ต้องการไซเรนแสงและเสียงที่สลับความถี่แบบตำรวจอวกาศ!' },
      {
        characterId: 'mentor',
        text: 'ต่อ Buzzer เข้าพิน 5, LED แดงเข้าพิน 13 และ GND ใช้ tone() สลับความถี่ 800 กับ 1200 Hz ให้ไฟกับเสียงสลับกันเหมือนไซเรน!'
      }
    ],
    endingDialogues: [{ characterId: 'officer', text: 'ยานผู้บุกรุกตกใจถอยหนีไปแล้ว! ไซเรนของคุณเยี่ยมมาก' }],
    terminals: [sig('5', 'BUZZER', 'BUZZER', '#A855F7'), sig('13', 'LED', 'LED', '#EF4444'), GND_TERM],
    parts: [partR220(), PART_CAPACITOR],
    requiredPartIds: ['r220'],
    targetComponentTitle: 'SIREN (BUZZER + LED)',
    codingTask: {
      instruction: 'ไฟติด+เสียงต่ำ 800Hz แล้วไฟดับ+เสียงสูง 1200Hz สลับกันทุก 300 ms',
      codeTemplate: [
        { kind: 'text', value: 'void setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  // เสียงต่ำ + ไฟติด\n  digitalWrite(13, HIGH);\n  tone(5, ' },
        { kind: 'blank', id: 0 },
        { kind: 'text', value: ');\n  delay(' },
        { kind: 'blank', id: 1 },
        { kind: 'text', value: ');\n  // เสียงสูง + ไฟดับ\n  digitalWrite(13, ' },
        { kind: 'blank', id: 2 },
        { kind: 'text', value: ');\n  tone(5, ' },
        { kind: 'blank', id: 3 },
        { kind: 'text', value: ');\n  delay(300);\n}' }
      ],
      correctAnswers: ['800', '300', 'LOW', '1200'],
      options: ['800', '1200', '300', '3000', 'HIGH', 'LOW']
    },
    successMessage: 'สำเร็จ! ไซเรนแสงเสียงสลับกัน ผู้บุกรุกถอยหนี!',
    failureMessage: 'เช็คสาย BUZZER, LED, GND และ Resistor'
  },
  {
    key: 'm4',
    level: 'middle',
    title: 'บทที่ 4: ไฟอัตโนมัติยามค่ำคืน',
    description: 'กลางคืนบนดาวอังคารมืดสนิท! ใช้ LDR วัดแสงแล้วให้ไฟเปิดเองเมื่อฟ้ามืด',
    moduleColor: '#4F46E5',
    componentType: 'lightSensor',
    dialogues: [
      { characterId: 'uncle', text: 'กลางคืนบนดาวอังคารมืดสนิท ลุงต้องเดินไปเปิดไฟเองทุกคืน เมื่อยจะแย่แล้ว!' },
      {
        characterId: 'mentor',
        text: 'งั้นสร้างไฟอัตโนมัติกัน! ใช้ LDR วัดแสงเข้าพิน A0 (ต่อ 5V และใส่ตัวต้านทาน 10kΩ เป็นตัวแบ่งแรงดัน) แล้วใช้ if/else เปิด LED พิน 13 เมื่อมืด อย่าลืม Resistor 220Ω ของ LED ด้วย!'
      }
    ],
    endingDialogues: [
      { characterId: 'uncle', text: 'ไฟติดเองตอนมืดเลย! ลุงสบายขึ้นเยอะ สุดยอดไปเลยหลานเอ๊ย' },
      { characterId: 'mentor', text: 'analogRead() ให้ค่า 0–1023 ในวงจรนี้ยิ่งมืดค่ายิ่งต่ำ เราจึงตั้งเงื่อนไข < 400' }
    ],
    terminals: [VCC_TERM, sig('A0', 'SENSOR', 'SENSOR', '#9333EA'), sig('13', 'LED', 'LED', '#EF4444'), GND_TERM],
    parts: [partR220(), PART_R10K, PART_CAPACITOR],
    requiredPartIds: ['r220', 'r10k'],
    targetComponentTitle: 'LDR + LED',
    codingTask: {
      instruction: 'อ่านค่าแสงจาก A0 ถ้าน้อยกว่า 400 (มืด) ให้เปิดไฟ LED พิน 13 ไม่งั้นปิดไฟ',
      codeTemplate: [
        { kind: 'text', value: 'void setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  int light = analogRead(' },
        { kind: 'blank', id: 0 },
        { kind: 'text', value: ');\n\n  if (light < ' },
        { kind: 'blank', id: 1 },
        { kind: 'text', value: ') {\n    // มืดแล้ว เปิดไฟ\n    digitalWrite(13, ' },
        { kind: 'blank', id: 2 },
        { kind: 'text', value: ');\n  } else {\n    digitalWrite(13, ' },
        { kind: 'blank', id: 3 },
        { kind: 'text', value: ');\n  }\n}' }
      ],
      correctAnswers: ['A0', '400', 'HIGH', 'LOW'],
      options: ['A0', '13', '400', '900', 'HIGH', 'LOW']
    },
    successMessage: 'สำเร็จ! ไฟเปิดเองอัตโนมัติเมื่อฟ้ามืด!',
    failureMessage: 'เช็คสาย VCC, SENSOR, LED, GND และ Resistor ทั้งสองตัว'
  },

  // ─────────── มัธยมปลาย (h1–h4) ───────────
  {
    key: 'h1',
    level: 'high',
    title: 'บทที่ 1: ไฟหรี่ประหยัดพลังงาน (PWM)',
    description: 'พลังงานสำรองเหลือน้อย! ใช้ PWM และลูป for ค่อยๆ หรี่-เร่งความสว่างของ LED',
    moduleColor: '#EAB308',
    componentType: 'dimmerLED',
    dialogues: [
      { characterId: 'aria', text: 'พลังงานสำรองกำลังจะหมด! ไฟสแตนด์บายต้องหรี่แสงได้เพื่อประหยัดพลังงาน แต่ digitalWrite เปิด/ปิดอย่างเดียวทำไม่ได้!' },
      {
        characterId: 'mentor',
        text: 'ใช้ PWM! ต่อ LED เข้าพิน 9 (พินที่รองรับ PWM) พร้อม Resistor และ GND แล้วใช้ analogWrite() ค่า 0–255 ร่วมกับลูป for ค่อยๆ เพิ่มความสว่างทีละนิด'
      }
    ],
    endingDialogues: [
      { characterId: 'aria', text: 'ระบบไฟหรี่ทำงานสมบูรณ์ ประหยัดพลังงานลงได้มหาศาล!' },
      { characterId: 'mentor', text: 'PWM คือการสลับเปิด-ปิดเร็วมากจนตามองเห็นเป็นความสว่างระดับกลางๆ นั่นเอง' }
    ],
    terminals: [sig('9'), GND_TERM],
    parts: [partR220('SIGNAL'), PART_CAPACITOR],
    requiredPartIds: ['r220'],
    targetComponentTitle: 'PWM LED',
    codingTask: {
      instruction: 'ลูป for เพิ่มความสว่างจาก 0 ถึง 255 ครั้งละ 5 ที่พิน PWM หมายเลข 9',
      codeTemplate: [
        { kind: 'text', value: 'void setup() {\n  pinMode(9, OUTPUT);\n}\n\nvoid loop() {\n  // ค่อยๆ เพิ่มความสว่าง\n  for (int i = ' },
        { kind: 'blank', id: 0 },
        { kind: 'text', value: '; i <= ' },
        { kind: 'blank', id: 1 },
        { kind: 'text', value: '; i = i + ' },
        { kind: 'blank', id: 2 },
        { kind: 'text', value: ') {\n    analogWrite(' },
        { kind: 'blank', id: 3 },
        { kind: 'text', value: ', i);\n    delay(20);\n  }\n}' }
      ],
      correctAnswers: ['0', '255', '5', '9'],
      options: ['0', '255', '5', '9', '13', '1023'],
      glossary: {
        '5': { title: 'ก้าวทีละ 5', desc: 'เพิ่มความสว่างครั้งละ 5 ยิ่งน้อยยิ่งเนียนแต่ยิ่งช้า', color: '#F97316' },
        '13': { title: 'พิน 13 ❌', desc: 'ไม่ใช่พิน PWM บน UNO ใช้ analogWrite แล้วจะหรี่ไม่ได้', color: '#EF4444' }
      }
    },
    successMessage: 'สำเร็จ! ไฟค่อยๆ สว่างขึ้นและหรี่ลงอย่างนุ่มนวล!',
    failureMessage: 'เช็คสายพิน 9 (PWM), GND และ Resistor'
  },
  {
    key: 'h2',
    level: 'high',
    title: 'บทที่ 2: พัดลมแรงสูงด้วยทรานซิสเตอร์',
    description: 'พัดลมใหญ่กินกระแสเกินพินบอร์ด! ใช้ทรานซิสเตอร์ขยายกระแส และเขียนฟังก์ชันคุมความเร็ว',
    moduleColor: '#06B6D4',
    componentType: 'fan',
    dialogues: [
      { characterId: 'dog', text: 'โฮ่งๆ! พัดลมตัวใหญ่ของห้องเครื่องหมุนไม่ไหวฮะ พินบอร์ดจ่ายกระแสไม่พอ!' },
      {
        characterId: 'mentor',
        text: 'คราวนี้ของจริง! ใช้ทรานซิสเตอร์เป็นสวิตช์ขยายกระแส: พิน 6 (PWM) ผ่าน Resistor 1kΩ เข้าขาเบส, มอเตอร์ต่อ 5V, ใส่ไดโอดกันไฟย้อน แล้วเขียนฟังก์ชัน setFanSpeed() คุมความเร็ว'
      }
    ],
    endingDialogues: [
      { characterId: 'dog', text: 'โฮ่งๆ! ลมแรงเย็นสบายเลยฮะ!' },
      { characterId: 'mentor', text: 'ไดโอด Flyback ป้องกันแรงดันสูงที่เกิดจากขดลวดมอเตอร์ตอนตัดไฟ — วิศวกรจริงๆ ใส่ทุกครั้งเลยนะ' }
    ],
    terminals: [sig('6', 'BASE', 'BASE', '#EF4444'), VCC_TERM, GND_TERM],
    parts: [PART_TRANSISTOR, PART_R1K, PART_DIODE, PART_CAPACITOR],
    requiredPartIds: ['transistor', 'r1k', 'diode'],
    targetComponentTitle: 'MOTOR + TRANSISTOR',
    codingTask: {
      instruction: 'ตั้งพัดลมที่พิน 6 หมุนที่ความเร็ว 200 (analogWrite รับค่า 0–255) ผ่านฟังก์ชัน setFanSpeed()',
      codeTemplate: [
        { kind: 'text', value: 'const int FAN_PIN = ' },
        { kind: 'blank', id: 0 },
        { kind: 'text', value: ';\nint speedLevel = ' },
        { kind: 'blank', id: 1 },
        { kind: 'text', value: ';\n\nvoid setup() {\n  pinMode(FAN_PIN, ' },
        { kind: 'blank', id: 2 },
        { kind: 'text', value: ');\n}\n\nvoid setFanSpeed(int s) {\n  analogWrite(FAN_PIN, ' },
        { kind: 'blank', id: 3 },
        { kind: 'text', value: ');\n}\n\nvoid loop() {\n  setFanSpeed(' },
        { kind: 'blank', id: 4 },
        { kind: 'text', value: ');\n}' }
      ],
      correctAnswers: ['6', '200', 'OUTPUT', 's', 'speedLevel'],
      options: ['6', '13', '200', '500', 'OUTPUT', 'INPUT', 's', 'speedLevel']
    },
    successMessage: 'สำเร็จ! ทรานซิสเตอร์ขยายกระแส พัดลมหมุนที่ความเร็ว 78%!',
    failureMessage: 'เช็คสาย BASE, VCC, GND และชิ้นส่วนที่จำเป็น'
  },
  {
    key: 'h3',
    level: 'high',
    title: 'บทที่ 3: ฟาร์มอัจฉริยะดาวอังคาร',
    description: 'ให้ปั๊มรดน้ำเองเมื่อดินแห้ง! อ่านเซนเซอร์ความชื้น ตัดสินใจด้วย if/else และดูค่าผ่าน Serial',
    moduleColor: '#16A34A',
    componentType: 'soilStation',
    dialogues: [
      { characterId: 'aunt', text: 'ป้าต้องคอยเดินเช็กดินทุกชั่วโมงเลยจ้ะ ถ้ามีเซนเซอร์วัดความชื้นให้ปั๊มรดน้ำเองได้ก็ดีสิ' },
      {
        characterId: 'mentor',
        text: 'สร้างระบบ Smart Farm กัน! เซนเซอร์ความชื้นต่อ A0 และ 5V, ปั๊มต่อพิน 10 ผ่านโมดูลรีเลย์, GND ร่วมกัน แล้วเขียนโค้ดอ่านค่าด้วย analogRead และรดน้ำเมื่อค่าความชื้น < 400'
      }
    ],
    endingDialogues: [
      { characterId: 'aunt', text: 'ปั๊มรดน้ำเองแล้ว ป้านั่งจิบชาได้แล้วจ้ะ!' },
      { characterId: 'mentor', text: 'Serial.println() ช่วยดูค่าจริงจากเซนเซอร์ เรียกว่าการ debug นักพัฒนาใช้กันทุกวัน' }
    ],
    terminals: [VCC_TERM, sig('A0', 'SENSOR', 'SENSOR', '#9333EA'), sig('10', 'PUMP', 'PUMP', '#3B82F6'), GND_TERM],
    parts: [PART_RELAY, PART_CAPACITOR, partR220()],
    requiredPartIds: ['relay'],
    targetComponentTitle: 'SOIL SENSOR + PUMP',
    codingTask: {
      instruction: 'อ่านความชื้นจาก A0 ถ้าน้อยกว่า 400 (ดินแห้ง) ให้เปิดปั๊มพิน 10 ไม่งั้นปิดปั๊ม',
      codeTemplate: [
        { kind: 'text', value: 'const int SENSOR = ' },
        { kind: 'blank', id: 0 },
        { kind: 'text', value: ';\nconst int PUMP = 10;\n\nvoid setup() {\n  pinMode(PUMP, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int moisture = ' },
        { kind: 'blank', id: 1 },
        { kind: 'text', value: '(SENSOR);\n  Serial.println(moisture);\n\n  if (moisture ' },
        { kind: 'blank', id: 2 },
        { kind: 'text', value: ' 400) {\n    // ดินแห้ง รดน้ำ\n    digitalWrite(PUMP, ' },
        { kind: 'blank', id: 3 },
        { kind: 'text', value: ');\n  } else {\n    digitalWrite(PUMP, ' },
        { kind: 'blank', id: 4 },
        { kind: 'text', value: ');\n  }\n  delay(500);\n}' }
      ],
      correctAnswers: ['A0', 'analogRead', '<', 'HIGH', 'LOW'],
      options: ['A0', '10', 'analogRead', 'digitalRead', '<', '>', 'HIGH', 'LOW']
    },
    successMessage: 'สำเร็จ! ปั๊มรดน้ำอัตโนมัติเมื่อดินแห้ง!',
    failureMessage: 'เช็คสาย VCC, SENSOR, PUMP, GND และโมดูลรีเลย์'
  },
  {
    key: 'h4',
    level: 'high',
    title: 'บทที่ 4: ศูนย์เตือนภัยอัจฉริยะ',
    description: 'ระบบเตือนภัยเดิมค้างเพราะ delay()! เขียนโค้ดแบบ non-blocking ด้วย millis() และตัวแปรสถานะ',
    moduleColor: '#DC2626',
    componentType: 'alarmSystem',
    dialogues: [
      { characterId: 'officer', text: 'เรดอเลิร์ตระดับสูงสุด! ระบบเตือนภัยเดิมใช้ delay() ทำให้บอร์ดไม่ตอบสนองปุ่มฉุกเฉินเลย!' },
      {
        characterId: 'mentor',
        text: 'ถึงเวลาเขียนโค้ดแบบมืออาชีพ! ต่อปุ่มพิน 7 (INPUT_PULLUP), LED พิน 13 พร้อม Resistor และ Buzzer พิน 5 แล้วใช้ millis() จับเวลาแทน delay() เพื่อให้บอร์ดทำหลายอย่างพร้อมกัน'
      }
    ],
    endingDialogues: [
      { characterId: 'officer', text: 'ระบบตอบสนองทันที! ยินดีด้วย คุณคือวิศวกรอวกาศตัวจริง' },
      { characterId: 'mentor', text: 'millis() คือหัวใจของงาน non-blocking ฝึกต่อยอดเป็นโปรเจกต์จริงของคุณเองได้เลย 🚀' }
    ],
    terminals: [
      sig('7', 'BUTTON', 'BUTTON', '#3B82F6'),
      sig('13', 'LED', 'LED', '#EF4444'),
      sig('5', 'BUZZER', 'BUZZER', '#A855F7'),
      GND_TERM
    ],
    parts: [partR220(), PART_PULLDOWN],
    requiredPartIds: ['r220'],
    targetComponentTitle: 'ALARM SYSTEM',
    codingTask: {
      instruction: 'กดปุ่ม (LOW) เพื่อเปิดสัญญาณ แล้วให้ไฟสลับสถานะทุก 500 ms ด้วย millis() โดยไม่ใช้ delay()',
      codeTemplate: [
        {
          kind: 'text',
          value:
            'unsigned long lastBlink = 0;\nbool ledState = false;\nbool alarmOn = false;\n\nvoid setup() {\n  pinMode(7, INPUT_PULLUP);\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  if (digitalRead(7) == '
        },
        { kind: 'blank', id: 0 },
        { kind: 'text', value: ') {\n    alarmOn = ' },
        { kind: 'blank', id: 1 },
        { kind: 'text', value: ';\n  }\n\n  if (alarmOn && millis() - lastBlink >= ' },
        { kind: 'blank', id: 2 },
        { kind: 'text', value: ') {\n    lastBlink = ' },
        { kind: 'blank', id: 3 },
        { kind: 'text', value: ';\n    ledState = ' },
        { kind: 'blank', id: 4 },
        { kind: 'text', value: ';\n    digitalWrite(13, ledState);\n    tone(5, 1000, 200);\n  }\n}' }
      ],
      correctAnswers: ['LOW', 'true', '500', 'millis()', '!ledState'],
      options: ['LOW', 'HIGH', 'true', 'false', '500', 'millis()', 'delay(500)', '!ledState', 'ledState'],
      glossary: {
        '500': { title: '500 ms', desc: 'กะพริบทุกครึ่งวินาที (เทียบกับ millis() ที่นับเป็น ms)', color: '#F97316' }
      }
    },
    successMessage: 'สำเร็จ! ระบบเตือนภัยกะพริบพร้อมเสียงโดยไม่หยุดรอ!',
    failureMessage: 'เช็คสาย BUTTON, LED, BUZZER, GND และ Resistor'
  }
];

export interface TechTaleDailyQuiz {
  question: string;
  choices: string[];
  answer: number;
  explain: string;
}

export const TECHTALE_DAILY_QUIZ_BANK: TechTaleDailyQuiz[] = [
  {
    question: 'ทำไมต้องต่อตัวต้านทาน (Resistor) กับ LED?',
    choices: ['ให้ไฟสว่างขึ้น', 'จำกัดกระแสไม่ให้ LED เสียหาย', 'เปลี่ยนสีไฟ', 'ทำให้กะพริบ'],
    answer: 1,
    explain: 'ตัวต้านทานช่วยจำกัดกระแสไฟ ถ้าไม่มี LED อาจได้รับกระแสมากเกินจนพังได้'
  },
  {
    question: 'คำสั่งใดใช้ตั้งค่าโหมดของพิน (INPUT/OUTPUT)?',
    choices: ['digitalWrite()', 'pinMode()', 'tone()', 'delay()'],
    answer: 1,
    explain: 'pinMode(พิน, OUTPUT) ใช้กำหนดว่าพินนั้นจะส่งสัญญาณออกหรือรับเข้า'
  },
  {
    question: 'digitalWrite(13, HIGH) หมายถึงอะไร?',
    choices: ['ปิดไฟพิน 13', 'อ่านค่าจากพิน 13', 'จ่ายไฟออกที่พิน 13', 'ตั้งพิน 13 เป็น INPUT'],
    answer: 2,
    explain: 'HIGH คือการจ่ายแรงดันไฟระดับสูงออกทางพินนั้น เพื่อเปิดอุปกรณ์'
  },
  {
    question: 'GND บนบอร์ดคืออะไร?',
    choices: ['ขั้วไฟ 5V', 'จุดอ้างอิง 0V (กราวด์)', 'พินสัญญาณเสียง', 'ปุ่มรีเซ็ต'],
    answer: 1,
    explain: 'GND คือกราวด์หรือจุดอ้างอิง 0V วงจรต้องต่อกลับมาที่ GND จึงจะครบวงจร'
  },
  {
    question: 'ฟังก์ชันใดใช้สร้างเสียงที่ความถี่ต่าง ๆ ให้ Buzzer?',
    choices: ['tone()', 'analogRead()', 'pinMode()', 'Serial.print()'],
    answer: 0,
    explain: 'tone(พิน, ความถี่) สร้างคลื่นเสียงตามความถี่ที่กำหนด เช่น 1000 Hz'
  },
  {
    question: 'บอร์ด ESP32 ใช้แรงดันลอจิกเท่าไร?',
    choices: ['1.5V', '3.3V', '5V', '12V'],
    answer: 1,
    explain: 'ESP32 ทำงานที่ 3.3V ต่างจาก Arduino UNO ที่ใช้ 5V'
  },
  {
    question: 'ฟังก์ชันใดใน Arduino ทำงานวนซ้ำไปเรื่อย ๆ?',
    choices: ['setup()', 'main()', 'loop()', 'start()'],
    answer: 2,
    explain: 'setup() ทำงานครั้งเดียวตอนเริ่ม ส่วน loop() ทำงานวนซ้ำตลอดเวลา'
  },
  {
    question: 'หน่วยของความต้านทานไฟฟ้าคืออะไร?',
    choices: ['โวลต์ (V)', 'แอมแปร์ (A)', 'วัตต์ (W)', 'โอห์ม (Ω)'],
    answer: 3,
    explain: 'ความต้านทานมีหน่วยเป็นโอห์ม (Ω) เช่น ตัวต้านทาน 220 Ω'
  }
];

export interface TechTaleProgress {
  points: number;
  completedKeys: string[];
  unlockedBadges: string[];
  quizStreak: number;
  quizCorrectTotal: number;
  lastQuizDay: string | null;
}

export interface TechTaleAchievement {
  id: string;
  title: string;
  detail: string;
  emoji: string;
  bonus: number;
  check: (p: TechTaleProgress) => boolean;
}

export const TECHTALE_ACHIEVEMENTS: TechTaleAchievement[] = [
  {
    id: 'first_lesson',
    title: 'ก้าวแรกของวิศวกร',
    detail: 'ผ่านภารกิจต่อวงจรแรกสำเร็จ',
    emoji: '⭐',
    bonus: 50,
    check: p => p.completedKeys.length >= 1
  },
  {
    id: 'two_lessons',
    title: 'ช่างไฟฝีมือดี',
    detail: 'ผ่านภารกิจครบ 2 บท',
    emoji: '⚡',
    bonus: 80,
    check: p => p.completedKeys.length >= 2
  },
  {
    id: 'all_lessons',
    title: 'ฮีโร่ประจำฐานอวกาศ',
    detail: 'ผ่านภารกิจครบทุกบท (12/12)',
    emoji: '🏆',
    bonus: 200,
    check: p => p.completedKeys.length >= TECHTALE_MISSIONS.length
  },
  {
    id: 'first_quiz',
    title: 'หัวไวไม่แพ้ใคร',
    detail: 'ตอบ Daily Quiz ถูกครั้งแรก',
    emoji: '🧠',
    bonus: 50,
    check: p => p.quizCorrectTotal >= 1
  },
  {
    id: 'streak3',
    title: 'ไฟลุกโชน 3 วัน',
    detail: 'เล่น Daily Quiz ติดกัน 3 วัน',
    emoji: '🔥',
    bonus: 100,
    check: p => p.quizStreak >= 3
  },
  {
    id: 'points500',
    title: 'นักสะสมแต้ม TechTale',
    detail: 'สะสมแต้มครบ 500 แต้ม',
    emoji: '✨',
    bonus: 100,
    check: p => p.points >= 500
  }
];

export const TECHTALE_RANKS = [
  'นักเรียนฝึกหัด',
  'ช่างไฟมือใหม่',
  'นักประดิษฐ์ดาวรุ่ง',
  'วิศวกรอวกาศ',
  'ตำนาน TechTale'
];

export const POINTS_PER_LEVEL = 200;
