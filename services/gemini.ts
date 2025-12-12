import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  let apiKey = '';
  
  try {
    // 1. Check standard process.env (Node/Vite)
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      // @ts-ignore
      apiKey = process.env.API_KEY;
    } 
    // 2. Check window.process.env (Injected by our build script)
    // @ts-ignore
    else if (typeof window !== 'undefined' && window.process && window.process.env && window.process.env.API_KEY) {
      // @ts-ignore
      apiKey = window.process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Could not access environment variables");
  }

  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI features will return mock data.");
    return null;
  }
  
  return new GoogleGenAI({ apiKey });
};

export const generateStudentRemark = async (
  studentName: string,
  className: string,
  performanceSummary: string
): Promise<string> => {
  const client = getClient();
  
  // Graceful fallback if no key is present
  if (!client) return "Excellent work! (AI Key missing)";

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a short, encouraging, and professional report card remark for a student named ${studentName} in class ${className}.
      
      Performance Summary: ${performanceSummary}
      
      The remark should be addressed to the parents or the student. Keep it under 30 words.`,
    });
    return response.text || "Keep up the good work!";
  } catch (error) {
    console.error("AI Error", error);
    return "Great effort this year! Keep striving for excellence.";
  }
};