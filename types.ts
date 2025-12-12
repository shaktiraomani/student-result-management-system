
export interface Student {
  id: string;
  srNo: string;
  rollNo: string;
  name: string;
  fatherName: string;
  motherName: string;
  className: string;
  mobile: string;
  dob: string;
  gender?: string;
  category?: string;
  admissionDate?: string;
  address: string;
  attendance: {
    totalDays: number;
    presentDays: number;
  };
  remarks?: string;
}

export interface Teacher {
  id: string;
  name: string;
  password: string;
  assignedClasses: string[];
}

export interface Subject {
  id: string;
  name: string;
  className: string;
  maxMarksTheory: number;
  maxMarksAssessment: number;
}

export interface MarkRecord {
  studentId: string;
  subjectId: string;
  examType: 'HalfYearly' | 'Annual';
  theory: number;
  assessment: number;
}

export interface TemplateOptions {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: 'sans' | 'serif' | 'mono';
  // New Design Customization Fields
  headerStyle?: 'standard' | 'modern' | 'minimal';
  tableStyle?: 'striped' | 'grid' | 'clean';
  borderStyle?: 'classic' | 'rounded' | 'none';
  showWatermark?: boolean;
}

export interface SchoolConfig {
  name: string;
  address: string;
  logoUrl: string;
  developerName: string;
  adminUsername?: string;
  adminPassword?: string;
  isResultsPublished: boolean;
  googleWebAppUrl?: string;
  sessionYear?: string;
  activeTemplate?: number;
  templatePreferences?: Record<number, TemplateOptions>;
}

export type ViewState = 'HOME' | 'ADMIN_LOGIN' | 'ADMIN_DASHBOARD' | 'TEACHER_LOGIN' | 'TEACHER_DASHBOARD' | 'STUDENT_RESULT';
