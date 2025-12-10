import { Student, Teacher, Subject, MarkRecord, SchoolConfig } from '../types';

const DEFAULT_CONFIG: SchoolConfig = {
  name: "Gyan Ganga Vidhya Mandir",
  address: "Vidhya Nagar, Sector 4, India",
  logoUrl: "",
  developerName: "Aapbiti News by SRM",
  adminUsername: "admin",
  adminPassword: "password",
  isResultsPublished: true
};

// --- VOLATILE RAM STORE (For Preview Only) ---
// This enables the app to be viewed in the browser without crashing.
// Data stored here is LOST upon refresh.
let RAM_DB = {
  students: [] as Student[],
  teachers: [] as Teacher[],
  subjects: [] as Subject[],
  marks: [] as MarkRecord[],
  config: DEFAULT_CONFIG
};

// --- Google Apps Script Type Definitions ---
declare global {
  interface Window {
    google?: {
      script: {
        run: {
          withSuccessHandler: (callback: (response: any) => void) => any;
          withFailureHandler: (callback: (error: Error) => void) => any;
          apiHandler: (payload: any) => void;
        };
      };
    };
  }
}

// --- Helper: Promisify google.script.run ---
const serverCall = async (action: string, payload: any = {}): Promise<any> => {
  
  // 1. FALLBACK FOR PREVIEW (RAM ONLY)
  // If window.google.script is missing, we are likely in a dev environment or preview.
  // We use RAM_DB so the UI works, but we warn the user.
  if (!window.google || !window.google.script) {
    console.warn("[DEV MODE] Google Apps Script API not found. Using volatile RAM storage. Data will NOT be saved to Sheets.");
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (action === 'get_all_data') {
      return JSON.parse(JSON.stringify(RAM_DB));
    }

    if (action === 'update_collection') {
      const { collectionName, data } = payload;
      if (collectionName === 'Students') RAM_DB.students = data;
      else if (collectionName === 'Teachers') RAM_DB.teachers = data;
      else if (collectionName === 'Subjects') RAM_DB.subjects = data;
      else if (collectionName === 'Marks') RAM_DB.marks = data;
      else if (collectionName === 'Config') RAM_DB.config = data[0];
      
      return { result: 'success' };
    }

    if (action === 'setup_db') {
      RAM_DB = {
        students: [], teachers: [], subjects: [], marks: [], config: DEFAULT_CONFIG
      };
      return { result: 'success' };
    }
    
    return { result: 'success' };
  }

  // 2. PRODUCTION MODE (Google Apps Script - SAVES TO SHEET)
  return new Promise((resolve, reject) => {
    window.google!.script.run
      .withSuccessHandler((response: string) => {
        try {
          const json = JSON.parse(response);
          if (json.result === 'success') {
            resolve(json.data || json.result);
          } else {
            console.error("Server Error:", json.error);
            reject(new Error(json.error || "Unknown server error"));
          }
        } catch (e) {
          console.error("JSON Parse Error", response);
          reject(new Error("Invalid JSON response from server"));
        }
      })
      .withFailureHandler((error: Error) => {
        console.error("GAS Failure", error);
        reject(error);
      })
      .apiHandler({ action, ...payload });
  });
};

export const api = {
  // --- DATABASE SETUP ---
  initializeDB: async () => {
    return serverCall('setup_db');
  },

  // --- DATA FETCHING ---
  fetchAllData: async (): Promise<{
    students: Student[];
    teachers: Teacher[];
    subjects: Subject[];
    marks: MarkRecord[];
    config: SchoolConfig;
  }> => {
    try {
      const data = await serverCall('get_all_data');
      return {
        students: data.students || [],
        teachers: data.teachers || [],
        subjects: data.subjects || [],
        marks: data.marks || [],
        config: data.config ? { ...DEFAULT_CONFIG, ...data.config } : DEFAULT_CONFIG
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Automatically attempt to setup DB if it's empty
      if (msg.includes("Database empty")) {
         await api.initializeDB();
         // Return empty structures after init
         return { students: [], teachers: [], subjects: [], marks: [], config: DEFAULT_CONFIG };
      }
      throw e;
    }
  },

  // --- DATA SAVING ---
  updateCollection: async (collectionName: string, data: any[]) => {
    return serverCall('update_collection', { collectionName, data });
  },

  saveStudents: async (students: Student[]) => api.updateCollection('Students', students),
  saveTeachers: async (teachers: Teacher[]) => api.updateCollection('Teachers', teachers),
  saveSubjects: async (subjects: Subject[]) => api.updateCollection('Subjects', subjects),
  saveMarks: async (marks: MarkRecord[]) => api.updateCollection('Marks', marks),
  saveConfig: async (config: SchoolConfig) => api.updateCollection('Config', [config]),
};

export const storage = api;