import { GoogleGenAI, Type } from "@google/genai";
import { InterviewContextData, InterviewTurn, AnalysisMetrics, ReportData } from "../types";
import { getApiKey } from "../env";

export const checkApiKey = () => {
  const key = getApiKey();
  if (!key || key.includes("YOUR_GEMINI_API_KEY") || key === '') {
    throw new Error("API Key is missing. Please add your API Key to the environment variables.");
  }
};

const getAI = () => new GoogleGenAI({ apiKey: getApiKey() });

// 2. Analyze Answer & Generate Next Question
export const analyzeAndNextQuestion = async (
  context: InterviewContextData,
  history: InterviewTurn[],
  audioBase64: string,
  videoFrameBase64: string
): Promise<{ 
  transcript: string; 
  analysis: AnalysisMetrics; 
  nextQuestion: string 
}> => {
  const ai = getAI();
  // Using gemini-2.5-flash as it is highly optimized for multimodal real-time tasks
  const model = "gemini-2.5-flash";

  // Optimization: Only send the last 2 turns to keep context focused and fast
  const recentHistory = history.slice(-2);
  const previousTurnsSummary = recentHistory.map((turn, i) => `
    Q: ${turn.question}
    A (Transcript): ${turn.transcript}
  `).join("\n");

  const lastTurn = history[history.length - 1];
  const lastQuestion = lastTurn ? lastTurn.question : "Tell me about yourself in brief.";

  const prompt = `
  ROLE: You are 'ProbeLensAI', an expert Technical Recruiter and Behavioral Psychologist.
  GOAL: Assist the Interviewer by deeply analyzing the Candidate's response and generating the NEXT question.
  
  INPUT CONTEXT:
  - Candidate Name: ${context.candidateName}
  - Last Question Asked: "${lastQuestion}"
  - The user (Interviewer) has recorded the Candidate's response (Audio + Video Frame).
  
  DOCUMENTS PROVIDED:
  - JOB DESCRIPTION: Contains required skills, responsibilities, and qualifications
  - RESUME: Candidate's experience, skills, and background
  - KNOWLEDGE BASE: Additional technical information for deeper questioning
  
  YOUR TASKS:
  1. TRANSCRIPT: Transcribe the audio accurately.
  2. DEEP OBSERVATION:
     - Analyze the audio for tone, confidence, and hesitation.
     - Analyze the video frame for facial expressions (stress, confusion, engagement).
     - Cross-check the content against the Job Description (JD) and Resume provided.
     - Detect any "Deception" or "Canned/ChatGPT-like" answers.
  3. GENERATE NEXT QUESTION:
     - MUST be dynamic based on the answer. DO NOT use pre-generated lists.
     - If the answer was technical, drill deeper into the *how* and *why* using the KNOWLEDGE BASE for technical depth.
     - If the answer was vague, ask for a specific real-world example from their RESUME.
     - If the answer was perfect, move to a different required skill from the JOB DESCRIPTION.
     - Keep the question professional but challenging.
     - ALWAYS reference specific skills or experiences from the provided documents.
  
  OUTPUT FORMAT: JSON Only.
  `;

  const parts: any[] = [{ text: prompt }];
  
  if (context.jobDescription?.textContent) {
      parts.push({ text: `JOB DESCRIPTION: ${context.jobDescription.textContent.substring(0, 2000)}` });
  }
  if (context.resume?.textContent) {
      parts.push({ text: `RESUME: ${context.resume.textContent.substring(0, 2000)}` });
  }
  if (context.knowledgeBase?.textContent) {
      parts.push({ text: `KNOWLEDGE BASE: ${context.knowledgeBase.textContent.substring(0, 2000)}` });
  }

  parts.push({ inlineData: { mimeType: "audio/wav", data: audioBase64 } });
  parts.push({ inlineData: { mimeType: "image/jpeg", data: videoFrameBase64 } });

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transcript: { type: Type.STRING },
          analysis: {
            type: Type.OBJECT,
            properties: {
              technicalAccuracy: { type: Type.NUMBER, description: "0-100 score of technical correctness" },
              communicationClarity: { type: Type.NUMBER, description: "0-100 score of speech clarity" },
              relevance: { type: Type.NUMBER, description: "0-100 how relevant to the question" },
              sentiment: { type: Type.STRING, enum: ["Positive", "Neutral", "Negative", "Confused", "Stressed"] },
              deceptionProbability: { type: Type.NUMBER, description: "0-100 probability of lying or reading a script" },
              keySkillsDemonstrated: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvementAreas: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          nextQuestion: { type: Type.STRING }
        }
      }
    }
  });

  const json = JSON.parse(response.text || "{}");
  return json;
};

// 3. Final Report Generation
export const generateFinalReport = async (
  history: InterviewTurn[],
  context: InterviewContextData
): Promise<ReportData> => {
  const ai = getAI();
  const model = "gemini-2.5-flash";

  const conversationLog = history.map((t, i) => `
    Turn ${i+1}:
    Q: ${t.question}
    A: ${t.transcript}
    Metrics: Technical=${t.analysis.technicalAccuracy}, Deception=${t.analysis.deceptionProbability}, Sentiment=${t.analysis.sentiment}
  `).join("\n");

  const prompt = `
    Generate a comprehensive "Interviewer's Final Decision Report" for candidate ${context.candidateName}.
    
    DOCUMENTS PROVIDED FOR CONTEXT:
    JOB DESCRIPTION: ${context.jobDescription?.textContent?.substring(0, 1000) || 'Not provided'}
    RESUME: ${context.resume?.textContent?.substring(0, 1000) || 'Not provided'}
    
    INPUT DATA:
    ${conversationLog}
    
    INSTRUCTIONS:
    - Analyze the ENTIRE session in the context of the provided JOB DESCRIPTION and RESUME.
    - Evaluate based on these specific pillars:
      1. Subject Knowledge (Depth of expertise matching job requirements)
      2. Behavioral (Culture fit, attitude based on resume experiences)
      3. Functional (Practical application of skills required by the job)
      4. Non-Functional (Scalability, performance mindset, security awareness as needed by the role)
      5. Communication (Clarity, articulation in discussing resume experiences)
      6. Technical (Coding/System Design accuracy matching job requirements)
    
    - Provide an "Executive Summary" suitable for a Hiring Manager that references specific examples from the conversation and documents.
    - Provide a "Recommendation" (Hire/No Hire) with clear justification based on job requirements.
    - Calculate an "Overall Score" (0-100) based on how well the candidate matches the job requirements.
    
    OUTPUT: JSON Only.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallScore: { type: Type.NUMBER },
          categoryScores: {
            type: Type.OBJECT,
            properties: {
              subjectKnowledge: { type: Type.NUMBER },
              behavioral: { type: Type.NUMBER },
              functional: { type: Type.NUMBER },
              nonFunctional: { type: Type.NUMBER },
              communication: { type: Type.NUMBER },
              technical: { type: Type.NUMBER }
            }
          },
          summary: { type: Type.STRING },
          recommendation: { type: Type.STRING, enum: ['HIRE', 'NO_HIRE', 'STRONG_HIRE', 'MAYBE'] },
          turns: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {} } }
        }
      }
    }
  });

  const json = JSON.parse(response.text || "{}");
  
  return {
    ...json,
    turns: history
  };
};
