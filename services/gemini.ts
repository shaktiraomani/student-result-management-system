import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  let apiKey = '';
  // Safely check for process.env to prevent "ReferenceError: process is not defined" crashes
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      apiKey = process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Could not access environment variables");
  }

  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const generateStudentRemark = async (
  studentName: string,
  className: string,
  performanceSummary: string
): Promise<string> => {
  const client = getClient();
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