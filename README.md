# 🌸 TUS Classroom Plus — Full-Stack Web Application

ระบบบริหารจัดการห้องเรียนและฐานข้อมูลออนไลน์ สำหรับรายวิชา **การออกแบบและเทคโนโลยี (ว30184)**  
**โรงเรียนเตรียมอุดมศึกษาภาคใต้** สังกัดสำนักงานเขตพื้นที่การศึกษามัธยมศึกษานครศรีธรรมราช

พัฒนาด้วย **Next.js (App Router + TypeScript + Tailwind CSS)** เชื่อมต่อ **Firebase Firestore ผ่านฝั่งเซิร์ฟเวอร์ (Firebase Admin SDK)** แยกสิทธิ์การทำงานชัดเจน 3 ระบบ:
- **`/`** — หน้าประชาสัมพันธ์โรงเรียน, อันดับเกม Top 1–5 และล็อกอิน/สมัครสมาชิกแยกตามบทบาท
- **`/student`** — พอร์ทัลนักเรียน (เข้าคลาสด้วยรหัสคลาส, บทเรียน & สไลด์, แบบทดสอบตรวจคะแนนบนเซิร์ฟเวอร์, ส่งงาน LINE พร้อมย่อขนาดภาพอัตโนมัติ, สมุดพกคะแนนส่วนตัว, เกม Block Blast XP และ AI Tutor พร้อมโหมดเสียง)
- **`/teacher`** — ศูนย์ควบคุมครูผู้สอน (ประกาศสตรีม, จัดการบทเรียน/ใบงาน, ตรวจงาน LINE ขยายภาพได้, สมุดคะแนน + วิเคราะห์ผลสัมฤทธิ์วิจัย Pre-test/Post-test + ส่งออก CSV ภาษาไทย, ชุดเครื่องมือ Gemini AI, จัดการห้องเรียน/นำเข้านักเรียนทั้งห้อง)
- **`/admin`** — ศูนย์ผู้ดูแลระบบและฐานข้อมูล (ภาพรวมคอลเลกชัน Firestore 10 คอลเลกชัน, ซิงค์ข้อมูล, สำรองฐานข้อมูล JSON, จัดการบัญชีครู/แอดมิน, จัดการข่าวประชาสัมพันธ์, ตรวจสอบความปลอดภัย และ Audit Logs)

---

## 🔒 มาตรฐานความปลอดภัย
- **Zero-Trust Firestore Rules (`firestore.rules`)**: ปิดการอ่าน/เขียนตรงจากเบราว์เซอร์ 100% (`allow read, write: if false;`) — ทุกคำขอผ่าน Next.js Backend API ด้วย Firebase Admin SDK เท่านั้น
- **ไม่ฝัง API Key หรือรหัสผ่านจริงในโค้ด**: คีย์ทั้งหมด (`FIREBASE_PRIVATE_KEY`, `GEMINI_API_KEY`, `SESSION_SECRET`) เก็บเฉพาะใน `.env.local` (ถูกกันไว้ใน `.gitignore`) หรือ Environment Variables บนเซิร์ฟเวอร์
- **ยืนยันตัวตนปลอดภัย**: รหัสผ่านทุกคนเข้ารหัสด้วย `bcryptjs` และใช้ Signed JWT ใน `HttpOnly Cookie` ร่วมกับ Next.js Middleware แยกสิทธิ์ตาม Route
- **ซ่อนเฉลยข้อสอบฝั่งเซิร์ฟเวอร์**: เบราว์เซอร์นักเรียนจะได้รับเฉพาะโจทย์และตัวเลือก การตรวจให้คะแนนทำบนเซิร์ฟเวอร์เท่านั้น

---

## 🚀 วิธีรันใช้งานในเครื่อง (Local Development)

```bash
npm install
npm run dev
```
เปิดเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)

> หากยังไม่ได้ตั้งค่า `.env.local` ระบบจะทำงานด้วยฐานข้อมูลจำลองในเครื่อง (`data/dev-db.json`) ให้ทดลองใช้งานได้ครบทุกฟีเจอร์ทันที

### บัญชีทดสอบเริ่มต้น (เมื่อสร้างฐานข้อมูลครั้งแรก)
| บทบาท | ชื่อผู้ใช้ / รหัส | รหัสผ่าน |
| :--- | :--- | :--- |
| ผู้ดูแลระบบ (Admin) | `admin` (หรือค่า `ADMIN_USERNAME` ใน `.env.local`) | `admin1234` (หรือ `ADMIN_PASSWORD`) |
| ครูผู้สอน (Teacher) | `teacher` | `1234` |
| นักเรียน (Student) | `6940201` (ห้อง ม.4/1 รหัสคลาส `TUS-4A8K`) | `1234` |

---

## ☁️ วิธีเชื่อมต่อ Firebase Firestore จริง & Deploy ออนไลน์ (Vercel / Render / Railway)

1. คัดลอกไฟล์ `.env.example` เป็น `.env.local` (สำหรับในเครื่อง) หรือเพิ่มตัวแปรใน **Environment Variables** บน Vercel/Render:
   - `SESSION_SECRET` — ข้อความสุ่มยาวอย่างน้อย 32 ตัวอักษร
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` — บัญชีแอดมินจริงของคุณ
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — จาก Firebase Console → Project Settings → Service accounts → Generate new private key
   - `GEMINI_API_KEY` — คีย์จาก Google AI Studio (เรียกใช้เฉพาะฝั่งเซิร์ฟเวอร์)
2. นำกฎจากไฟล์ `firestore.rules` ไปวางใน **Firebase Console → Firestore Database → Rules** แล้วกด **Publish**
3. เมื่อเปิดใช้งานครั้งแรก ระบบจะสร้างคอลเลกชันทั้ง 10 คอลเลกชันให้อัตโนมัติ (หรือกดปุ่ม **ซิงค์ข้อมูลมาตรฐาน** ในหน้า `/admin`)

> โค้ดระบบ HTML เดิมถูกเก็บสำรองไว้ในโฟลเดอร์ `legacy-html/` อย่างครบถ้วน
