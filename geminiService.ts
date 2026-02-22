
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => {
  const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!key || key === 'undefined') return null;
  return new GoogleGenAI({ apiKey: key });
};

const ai = getAI();

export const analyzeAuditLogs = async (logs: any[]) => {
  try {
    if (!ai) return "Analysis unavailable: API key not configured.";
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the following manufacturing audit logs for potential issues, bottlenecks, or security risks. Summarize key findings. Logs: ${JSON.stringify(logs.slice(0, 50))}`,
      config: {
        temperature: 0.2,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini analysis failed", error);
    return "Analysis unavailable at this moment.";
  }
};

export const suggestWorkflow = async (productDesc: string) => {
  try {
    if (!ai) return null;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on this product description, suggest a 5-stage manufacturing workflow. Description: ${productDesc}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["name"]
          }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    return null;
  }
};
