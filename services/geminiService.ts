import { GoogleGenAI, Type } from "@google/genai";
import { InterviewContextData, InterviewTurn, AnalysisMetrics, ReportData, AnswerQuality, QuestionComplexity } from "../types";
import { API_KEY as ENV_KEY } from "../env";

const getApiKey = () => {
  const key = process.env.API_KEY || ENV_KEY;
  return key;
};

export const checkApiKey = () => {
  const key = getApiKey();
  if (!key || key.includes("YOUR_GEMINI_API_KEY") || key === '') {
    throw new Error("API Key is missing. Please check your env.ts file.");
  }
};

const getAI = () => new GoogleGenAI({ apiKey: getApiKey() });

// Helper to attach file parts correctly
const attachFilePart = (fileData: any, label: string) => {
    if (fileData.base64) {
        return [
            { text: `[SYSTEM: The user has uploaded a file for ${label}. Use this context strictly.]` },
            { inlineData: { mimeType: fileData.type, data: fileData.base64 } }
        ];
    } else if (fileData.textContent) {
        return [{ text: `${label.toUpperCase()} CONTENT:\n${fileData.textContent.substring(0, 15000)}` }];
    }
    return [];
};

// PHASE 1: FAST execution (Transcript + Next Question)
export const generateFastNextQuestion = async (
  context: InterviewContextData,
  history: InterviewTurn[],
  audioBase64: string
): Promise<{ 
  transcript: string; 
  nextQuestion: string;
  nextComplexity: QuestionComplexity;
  answerQuality: AnswerQuality; 
}> => {
  const ai = getAI();
  const model = "gemini-2.5-flash"; // High speed model

  const lastTurn = history[history.length - 1];
  const lastQuestion = lastTurn ? lastTurn.question : "Tell me about yourself in brief.";
  const lastComplexity = lastTurn ? lastTurn.questionComplexity : "Basic";

  const prompt = `
  ROLE: You are the 'ProbeLensAI' Interview Orchestrator. Speed is critical.
  
  CONTEXT:
  - Candidate: ${context.candidateName}
  - Last Question: "${lastQuestion}" (Level: ${lastComplexity})
  
  TASK:
  1. Transcribe the user's audio response accurately. IF AUDIO IS SILENT OR UNINTELLIGIBLE, return transcript as "(No audible response detected)".
  2. Assess Answer Quality (Basic/Intermediate/Expert).
  3. Generate the Next Question based on ADAPTIVE LOGIC:
     - IF Basic: Drill down or ask for clarification.
     - IF Intermediate: Ask for a specific example or edge case.
     - IF Expert: Escalate to a complex system design or tradeoff scenario.
  4. STRICTLY use the Job Description and Resume context for the question topic.

  OUTPUT JSON ONLY.
  `;

  const parts: any[] = [{ text: prompt }];
  
  // Attach Context
  if (context.jobDescription) parts.push(...attachFilePart(context.jobDescription, "Job Description"));
  if (context.resume) parts.push(...attachFilePart(context.resume, "Candidate Resume"));
  
  // Attach Audio
  parts.push({ inlineData: { mimeType: "audio/wav", data: audioBase64 } });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING },
            answerQuality: { type: Type.STRING, enum: ["Basic", "Intermediate", "Expert"] },
            nextQuestion: { type: Type.STRING },
            nextComplexity: { type: Type.STRING, enum: ["Basic", "Intermediate", "Expert"] }
          }
        }
      }
    });

    const json = JSON.parse(response.text || "{}");
    
    // Validation
    if (!json.transcript || json.transcript.trim() === "") {
        json.transcript = "(No audible response detected)";
    }
    if (!json.nextQuestion) {
        json.nextQuestion = "Could you clarify your previous answer?";
    }

    return json;
  } catch (error) {
    console.error("Fast Gen Error:", error);
    return {
      transcript: "(Audio transcription failed)",
      answerQuality: "Basic",
      nextQuestion: "I didn't catch that. Could you repeat?",
      nextComplexity: "Basic"
    };
  }
};

// PHASE 2: DEEP execution (Integrity, Sentiment, Skills) - Background Process
export const analyzeResponseDeeply = async (
  context: InterviewContextData,
  transcript: string,
  audioBase64: string,
  videoFrameBase64: string,
  previousQuestion: string
): Promise<AnalysisMetrics> => {
  const ai = getAI();
  const model = "gemini-2.5-flash"; 

  const prompt = `
  ROLE: You are 'ProbeLensAI' Forensic Analyst.
  
  INPUT:
  - Question: "${previousQuestion}"
  - Transcript: "${transcript}"
  - Evidence: Audio Audio & Video Frame attached.

  TASK:
  1. INTEGRITY CHECK (Cheating Detection):
     - VISUAL: Look at the video frame. Are eyes darting off-screen? Is there a phone?
     - AUDIO: Listen for typing sounds, whispering, or TTS artifacts.
     - CONTENT: Is the answer a copy-paste definition?
  
  2. BEHAVIORAL PROFILING:
     - Analyze Sentiment, Pace, and STAR Method adherence.
     - Identify Key Skills demonstrated.

  OUTPUT JSON ONLY.
  `;

  const parts: any[] = [{ text: prompt }];
  // Re-attach video/audio for forensic analysis
  parts.push({ inlineData: { mimeType: "audio/wav", data: audioBase64 } });
  parts.push({ inlineData: { mimeType: "image/jpeg", data: videoFrameBase64 } });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            technicalAccuracy: { type: Type.NUMBER },
            communicationClarity: { type: Type.NUMBER },
            relevance: { type: Type.NUMBER },
            sentiment: { type: Type.STRING, enum: ["Positive", "Neutral", "Negative", "Anxious", "Confident", "Defensive"] },
            deceptionProbability: { type: Type.NUMBER },
            paceOfSpeech: { type: Type.STRING, enum: ["Slow", "Normal", "Fast", "Rushed"] },
            starMethodAdherence: { type: Type.BOOLEAN },
            keySkillsDemonstrated: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvementAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
            integrity: {
                type: Type.OBJECT,
                properties: {
                    status: { type: Type.STRING, enum: ["Clean", "Suspicious"] },
                    flaggedReason: { type: Type.STRING }
                }
            },
            answerQuality: { type: Type.STRING, enum: ["Basic", "Intermediate", "Expert"] }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Deep Analysis Error:", error);
    // RETURN 0 to indicate failure, do not fake "50"
    return {
        technicalAccuracy: 0, communicationClarity: 0, relevance: 0, sentiment: "Neutral",
        deceptionProbability: 0, paceOfSpeech: "Normal", starMethodAdherence: false,
        keySkillsDemonstrated: [], improvementAreas: ["Analysis Failed"],
        integrity: { status: "Clean" }, answerQuality: "Basic"
    };
  }
};

// 3. Final Report Generation
export const generateFinalReport = async (
  history: InterviewTurn[],
  context: InterviewContextData
): Promise<ReportData> => {
  const ai = getAI();
  const model = "gemini-2.5-flash";

  // REAL-TIME GUARDRAIL:
  // Filter out turns that failed transcription or were silent.
  const validTurns = history.filter(t => 
    t.transcript && 
    t.transcript.length > 5 && 
    !t.transcript.includes("(Audio transcription failed)") &&
    !t.transcript.includes("(No audible response detected)")
  );

  // If no valid conversation occurred, return a NO_DATA report immediately.
  // DO NOT ask Gemini to generate a report from empty data (Hallucination prevention).
  if (validTurns.length === 0) {
      return {
        overallScore: 0,
        integrityScore: 0,
        skillDepthBreakdown: { basic: 0, intermediate: 0, expert: 0 },
        categoryScores: {
          subjectKnowledge: 0, behavioral: 0, functional: 0, 
          nonFunctional: 0, communication: 0, technical: 0
        },
        summary: "Interview ended without any valid candidate conversation.",
        psychologicalProfile: "N/A - No Data Recorded",
        recommendation: 'NO_HIRE',
        turns: []
      };
  }

  const conversationLog = validTurns.map((t, i) => `
    [Turn ${i+1} | Level: ${t.questionComplexity}]
    Q: ${t.question}
    A: ${t.transcript}
    [Metrics] Accuracy: ${t.analysis.technicalAccuracy}, Integrity: ${t.analysis.integrity.status}, Quality: ${t.analysis.answerQuality}
  `).join("\n");

  const prompt = `
    Generate the "ProbeLensAI Final Decision Report" for ${context.candidateName}.
    
    INPUT: Full Interview Log below.
    ${conversationLog}
    
    TASKS:
    1. Calculate purely objective scores (0-100).
    2. Write a "Psychological Profile": Analyze confidence, stress response, and consistency.
    3. Analyze "Skill Depth": Count how many answers were Basic vs Expert.
    4. Calculate "Integrity Score": Start at 100, deduct for every "Suspicious" flag.
    5. Final Recommendation: Be decisive.
    
    OUTPUT JSON ONLY.
  `;

  const parts: any[] = [{ text: prompt }];

  if (context.resume) parts.push(...attachFilePart(context.resume, "Resume Reference"));
  if (context.jobDescription) parts.push(...attachFilePart(context.jobDescription, "Job Requirements"));

  try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallScore: { type: Type.NUMBER },
              integrityScore: { type: Type.NUMBER },
              skillDepthBreakdown: {
                type: Type.OBJECT,
                properties: {
                    basic: { type: Type.NUMBER },
                    intermediate: { type: Type.NUMBER },
                    expert: { type: Type.NUMBER }
                }
              },
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
              psychologicalProfile: { type: Type.STRING },
              recommendation: { type: Type.STRING, enum: ['HIRE', 'NO_HIRE', 'STRONG_HIRE', 'MAYBE'] }
            }
          }
        }
      });

      const json = JSON.parse(response.text || "{}");
      
      return {
        ...json,
        turns: validTurns // Only attach valid turns
      };
  } catch (error) {
      console.error("Gemini API Error in Report:", error);
      throw error;
  }
};