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
  gender?: string;        // Added
  category?: string;      // Added (Gen, OBC, SC, ST)
  admissionDate?: string; // Added
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
  sessionYear?: string;     // Added
  activeTemplate?: number;  // Added (1-5)
  templatePreferences?: Record<number, TemplateOptions>; // Added for customization
}

export type ViewState = 'HOME' | 'ADMIN_LOGIN' | 'ADMIN_DASHBOARD' | 'TEACHER_LOGIN' | 'TEACHER_DASHBOARD' | 'STUDENT_RESULT';