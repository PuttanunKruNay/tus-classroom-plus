export type UserRole = 'admin' | 'teacher' | 'student';

export interface SessionUser {
  id: string;
  role: UserRole;
  nameTh: string;
  username?: string;
  studentId?: string;
  position?: string;
  classId?: string;
  classCodes?: string[];
}

export interface StaffUser {
  id: string;
  username: string;
  passwordHash: string;
  plainPassword?: string; // เก็บสำหรับผู้ดูแลระบบ (Admin) ตรวจสอบเท่านั้น ห้ามส่งออกนอก API แอดมิน
  nameTh: string;
  role: 'admin' | 'teacher';
  position: string;
  department: string;
  email?: string;
  avatarUrl: string;
  createdAt: string;
}

export type PublicStaffUser = Omit<StaffUser, 'passwordHash' | 'plainPassword'>;
export type AdminStaffView = Omit<StaffUser, 'passwordHash'>;

export interface ClassRoom {
  id: string;
  gradeLevel: string; // ม.1 - ม.6
  roomNo: string; // 1 - 13
  name: string; // เช่น ม.4/1
  courseCode: string;
  courseName: string;
  classCode: string; // เช่น TUS-4A8K
  teacherId?: string;
  enrollmentOpen?: boolean; // เปิด/ปิดรับสมัครชั่วคราว
  archived?: boolean; // ชั้นเรียนที่เก็บ
  gradeSheetUrl?: string; // ลิงก์ Google Sheets สรุปคะแนนประจำห้องจาก Google Drive
  gradeSheetUpdatedAt?: string;
  createdAt: string;
}

export interface StudentRecord {
  studentId: string;
  passwordHash: string;
  plainPassword?: string; // เก็บสำหรับผู้ดูแลระบบ (Admin) ตรวจสอบรายห้องเท่านั้น
  prefix: string;
  firstName: string;
  lastName: string;
  number: number;
  classId: string;
  classCodes: string[];
  attendance: number;
  gameXp: number;
  gameBestScore: number;
  gamePlays: number;
  dailyXpDate?: string; // YYYY-MM-DD (Bangkok)
  dailyXpEarned?: number;
  dailyChallengeDate?: string;
  badges?: string[];
  dailyAiDate?: string; // YYYY-MM-DD (Bangkok)
  dailyAiCount?: number;
  createdAt: string;
}

export type PublicStudent = Omit<StudentRecord, 'passwordHash' | 'plainPassword'>;
export type AdminStudentView = Omit<StudentRecord, 'passwordHash'>;

export interface Topic {
  id: string;
  title: string;
  order: number;
}

export interface LessonSlide {
  id: string;
  title: string;
  summary: string;
  embedUrl: string;
  externalUrl: string;
}

export interface DeckPage {
  title: string;
  badge: string;
  bullets: string[];
  codeSample?: string;
}

export type PublishStatus = 'published' | 'scheduled' | 'draft';

export interface Lesson {
  id: string;
  unit: string;
  chapter: string;
  hours: string;
  description: string;
  keyPoints: string[];
  slides: LessonSlide[];
  deckPages: DeckPage[];
  order: number;
  publishStatus?: PublishStatus;
  scheduledAt?: string;
  publishedAt?: string;
  modelUrl?: string;
  posterUrl?: string;
}

export type AssignmentCategory = 'form' | 'line' | 'activity' | 'question';

export interface Assignment {
  id: string;
  code: string;
  title: string;
  category: AssignmentCategory;
  topicUnit: string;
  maxScore: number;
  dueDate: string;
  description: string;
  instruction?: string;
  formEmbedUrl?: string;
  formExternalUrl?: string;
  order: number;
  publishStatus?: PublishStatus;
  scheduledAt?: string;
  publishedAt?: string;
  modelUrl?: string;
  posterUrl?: string;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
}

export type StudentQuizQuestion = Omit<QuizQuestion, 'answer'>;

export interface QuizBankDoc {
  assignmentId: string;
  questions: QuizQuestion[];
  updatedAt: string;
}

export type SubmissionStatus = 'pending_review' | 'graded' | 'not_submitted';

export interface SubmissionRecord {
  id: string; // `${studentId}__${assignmentId}` หรือ `${studentId}__${assignmentId}__${timestamp}` กรณีส่งซ้ำ
  studentId: string;
  assignmentId: string;
  score: number | null;
  status: SubmissionStatus;
  lineName?: string;
  note?: string;
  proofImage?: string;
  teacherComment?: string;
  quizAnswers?: number[];
  submittedAt?: string;
  updatedAt: string;
  gradedBy?: string;
  deletedAt?: string | null; // รองรับ Undo ภายใน 5 วินาที
  previousState?: {
    score: number | null;
    status: SubmissionStatus;
    teacherComment?: string;
    gradedBy?: string;
  } | null;
}

export interface StreamComment {
  id: string;
  author: string;
  authorRole: UserRole;
  text: string;
  time: string;
}

export interface StreamAttachment {
  type: 'link' | 'youtube' | 'file';
  label: string;
  url: string;
}

export interface StreamPost {
  id: string;
  author: string;
  role: 'admin' | 'teacher';
  avatar: string;
  createdAt: string;
  pinned: boolean;
  title: string;
  content: string;
  classId?: string; // '' = ทุกห้องเรียน
  targetGroup?: string; // เช่น 'นักเรียนทุกคน'
  attachments?: StreamAttachment[];
  publishStatus?: PublishStatus;
  scheduledAt?: string; // ISO/local datetime string สำหรับตั้งเวลาโพสต์
  publishedAt?: string;
  comments: StreamComment[];
}

export interface PrBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  badge: string;
}

export interface PrNewsItem {
  id: string;
  title: string;
  category: string;
  date: string;
  imageUrl: string;
  summary: string;
  linkUrl: string;
}

export interface CourseOverview {
  courseCode: string;
  courseNameTh: string;
  courseNameEn: string;
  targetGrade: string;
  semester: string;
  totalHours: string;
  bookTitle: string;
  bookPublisher: string;
  bookCoverUrl: string;
  obecLogoUrl: string;
  ebookPortalUrl: string;
  shortIntro: string;
  fullDescription: string;
  objectives: string[];
}

export interface SchoolInfo {
  nameTh: string;
  nameEn: string;
  shortName: string;
  affiliation: string;
  color: string;
  philosophy: string;
  tree: string;
  motto: string;
  website: string;
  address: string;
}

export interface PrContentDoc {
  id: 'main';
  systemTitle: string;
  schoolInfo: SchoolInfo;
  courseOverview: CourseOverview;
  prBanners: PrBanner[];
  prNewsList: PrNewsItem[];
  defaultGradeSheetUrl?: string;
  defaultGradeSheetUpdatedAt?: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  detail: string;
  createdAt: string;
}

export interface TeacherMessage {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  teacherKey: 'puttanun' | 'apirom';
  teacherName: string;
  teacherEmail: string;
  subject: string;
  message: string;
  status: 'open' | 'replied';
  teacherReply?: string;
  repliedBy?: string;
  repliedAt?: string;
  emailSent?: boolean;
  emailError?: string;
  createdAt: string;
}

export interface DatabaseStats {
  mode: 'firestore' | 'local-dev';
  projectId: string | null;
  geminiConfigured: boolean;
  smtpConfigured?: boolean;
  collections: {
    users: number;
    classes: number;
    students: number;
    topics: number;
    lessons: number;
    assignments: number;
    quizzes: number;
    submissions: number;
    announcements: number;
    teacher_messages?: number;
    audit_logs: number;
  };
}
