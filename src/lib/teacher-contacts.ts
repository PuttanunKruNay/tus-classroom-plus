export interface TeacherContactInfo {
  key: 'puttanun' | 'apirom';
  username: string;
  shortName: string;
  fullName: string;
  email: string;
  roleTitle: string;
  avatarUrl: string;
}

export const TEACHER_CONTACTS: TeacherContactInfo[] = [
  {
    key: 'puttanun',
    username: 'Puttanun',
    shortName: 'ครูเนย์',
    fullName: 'ครูเนย์ (พุฒินันท์)',
    email: 'puttanun_noi@triamudomsouth.ac.th',
    roleTitle: 'ครูผู้สอน วิชาการออกแบบและเทคโนโลยี',
    avatarUrl: '/assets/logo_phrakiao.png?v=3'
  },
  {
    key: 'apirom',
    username: 'Apirom',
    shortName: 'ครูขวัญ',
    fullName: 'ครูขวัญ (อภิรมย์ กึกก้อง)',
    email: 'apirom_kue@traimudomsouth.ac.th',
    roleTitle: 'ครูผู้สอน วิชาการออกแบบและเทคโนโลยี',
    avatarUrl: '/assets/teacher_portrait.jpg'
  }
];

export function getTeacherContact(key: string): TeacherContactInfo | null {
  return TEACHER_CONTACTS.find(t => t.key === key) || null;
}
