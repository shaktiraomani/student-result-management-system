import { Student, Teacher, Subject, MarkRecord, SchoolConfig } from '../types';

const DEFAULT_CONFIG: SchoolConfig = {
  name: "Gyan Ganga Vidhya Mandir",
  address: "Vidhya Nagar, Sector 4, India",
  logoUrl: "",
  developerName: "Aapbiti News by SRM",
  adminUsername: "admin",
  adminPassword: "password",
  isResultsPublished: true,
  sessionYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
};

// --- VOLATILE RAM STORE (For Preview Only) ---
let RAM_DB = {
  students: [] as Student[],
  teachers: [] as Teacher[],
  subjects: [] as Subject[],
  marks: [] as MarkRecord[],
  config: DEFAULT_CONFIG
};

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

// --- Helper: Promisify google.script.run WITH TIMEOUT ---
const serverCall = async (action: string, payload: any = {}): Promise<any> => {
  
  // 1. FALLBACK FOR PREVIEW (Localhost)
  if (!window.google || !window.google.script) {
    console.warn("[DEV MODE] Using RAM storage. No Google Script Detected.");
    await new Promise(resolve => setTimeout(resolve, 500));

    if (action === 'get_all_data') return JSON.parse(JSON.stringify(RAM_DB));
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
      RAM_DB = { students: [], teachers: [], subjects: [], marks: [], config: DEFAULT_CONFIG };
      return { result: 'success' };
    }
    return { result: 'success' };
  }

  // 2. PRODUCTION MODE (Google Apps Script)
  const serverPromise = new Promise((resolve, reject) => {
    try {
      window.google!.script.run
        .withSuccessHandler((response: string) => {
          try {
            const json = JSON.parse(response);
            if (json.result === 'success') {
              resolve(json.data || json.result);
            } else {
              reject(new Error(json.error || "Unknown server error"));
            }
          } catch (e) {
            console.error("JSON Parse Error", e, response);
            reject(new Error("Invalid JSON response from server"));
          }
        })
        .withFailureHandler((error: Error) => {
          console.error("GAS Failure Handler", error);
          reject(error);
        })
        .apiHandler({ action, ...payload });
    } catch (e) {
      console.error("GAS Execution Error", e);
      reject(e);
    }
  });

  // Timeout Promise (50 Seconds)
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Server timeout. Please reload or check connection.")), 50000)
  );

  return Promise.race([serverPromise, timeoutPromise]);
};

export const api = {
  initializeDB: async () => serverCall('setup_db'),
  fetchAllData: async () => {
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
      if (msg.includes("Database empty")) {
         await api.initializeDB();
         return { students: [], teachers: [], subjects: [], marks: [], config: DEFAULT_CONFIG };
      }
      throw e;
    }
  },
  updateCollection: async (collectionName: string, data: any[]) => serverCall('update_collection', { collectionName, data }),
  saveStudents: async (students: Student[]) => api.updateCollection('Students', students),
  saveTeachers: async (teachers: Teacher[]) => api.updateCollection('Teachers', teachers),
  saveSubjects: async (subjects: Subject[]) => api.updateCollection('Subjects', subjects),
  saveMarks: async (marks: MarkRecord[]) => api.updateCollection('Marks', marks),
  saveConfig: async (config: SchoolConfig) => api.updateCollection('Config', [config]),
};

export const storage = api;