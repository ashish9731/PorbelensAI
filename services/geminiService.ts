

import { GoogleGenAI, Type } from "@google/genai";
import { InterviewContextData, InterviewTurn, AnalysisMetrics, ReportData, AnswerQuality, QuestionComplexity, CodeAnalysisData, CodingChallenge, PreInterviewAnalysis, FileData } from "../types";
import { API_KEY as ENV_KEY } from '../env';

export const checkApiKey = () => {
  const key = process.env.API_KEY || ENV_KEY;
  if (!key) {
    throw new Error("API Key is missing. Please check your env variables.");
  }
};

const getAI = () => {
    const key = process.env.API_KEY || ENV_KEY;
    return new GoogleGenAI({ apiKey: key });
}

// Helper to attach file parts correctly
const attachFilePart = (fileData: any, label: string) => {
    if (fileData.base64) {
        return [
            { text: `[SYSTEM: The user has uploaded a file for ${label}. Use this context strictly. Do not ignore.]` },
            { inlineData: { mimeType: fileData.type, data: fileData.base64 } }
        ];
    } else if (fileData.textContent) {
        return [{ text: `${label.toUpperCase()} CONTENT:\n${fileData.textContent.substring(0, 20000)}` }];
    }
    return [];
};

// FEATURE: Pre-Interview Resume Analysis
export const analyzeResumeMatch = async (resume: FileData, jd: FileData): Promise<PreInterviewAnalysis> => {
    const ai = getAI();
    const model = "gemini-2.5-flash"; // Fast enough for batch processing

    const prompt = `
    ROLE: Expert Technical Recruiter & ATS System.
    TASK: Analyze the Candidate Resume against the Job Description.
    
    METRICS TO CALCULATE:
    1. Resume Score (0-100): How well do the skills match the JD requirements?
    2. ATS Score (0-100): Is the resume formatted well? Does it contain keywords from the JD?
    3. Recommendation: Should we interview this candidate?
    4. Key Gap: What is the biggest missing skill? (Short phrase)

    OUTPUT JSON ONLY.
    `;

    const parts: any[] = [{ text: prompt }];
    parts.push(...attachFilePart(jd, "Job Description"));
    parts.push(...attachFilePart(resume, "Candidate Resume"));

    try {
        const response = await ai.models.generateContent({
            model,
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        resumeScore: { type: Type.NUMBER },
                        atsScore: { type: Type.NUMBER },
                        recommendation: { type: Type.STRING, enum: ["Interview", "Shortlist", "Reject"] },
                        keyGap: { type: Type.STRING }
                    }
                }
            }
        });
        const resText = response.text || "{}";
        return JSON.parse(resText);
    } catch (e: any) {
        console.error("Resume Analysis Failed", e);
        return {
            resumeScore: 0,
            atsScore: 0,
            recommendation: 'Reject',
            keyGap: `Analysis Error: ${e.message || "Unknown"}`
        };
    }
};

// PHASE 1: FAST execution (Transcript + Next Question)
export const generateFastNextQuestion = async (
  context: InterviewContextData,
  history: InterviewTurn[],
  mediaBase64: string
): Promise<{ 
  transcript: string; 
  nextQuestion: string;
  nextComplexity: QuestionComplexity;
  answerQuality: AnswerQuality; 
}> => {
  const ai = getAI();
  const model = "gemini-2.5-flash"; // Best for Multimodal Speed

  const lastTurn = history[history.length - 1];
  const lastQuestion = lastTurn ? lastTurn.question : "Tell me about yourself in brief.";
  const lastComplexity = lastTurn ? lastTurn.questionComplexity : "Basic";

  const prompt = `
  ROLE: You are 'ProbeLensAI', an expert Technical Interviewer.
  
  CURRENT STATE:
  - Candidate Name: ${context.candidateName}
  - Current Question: "${lastQuestion}"
  - Difficulty Level: ${lastComplexity}
  
  TASK:
  1. LISTEN to the attached video/audio clip carefully.
  2. TRANSCRIBE the candidate's response word-for-word. 
     - CRITICAL: If the audio is silent, unintelligible, or empty, output exactly: "(No audible response detected)".
     - DO NOT INVENT TEXT. DO NOT HALLUCINATE A RESPONSE.
  3. EVALUATE the answer quality (Basic, Intermediate, or Expert).
  4. GENERATE the Next Question:
     - The next question must be logically connected to the candidate's last answer.
     - If they failed to answer, ask them to repeat or clarify.
     - Use the Job Description, Resume, AND Knowledge Base (provided in context) to guide the topic.

  OUTPUT JSON ONLY.
  `;

  const parts: any[] = [{ text: prompt }];
  
  // Attach Context
  if (context.jobDescription) parts.push(...attachFilePart(context.jobDescription, "Job Description"));
  if (context.resume) parts.push(...attachFilePart(context.resume, "Candidate Resume"));
  if (context.knowledgeBase) parts.push(...attachFilePart(context.knowledgeBase, "Company Knowledge Base"));
  
  // Attach Audio/Video - CRITICAL FIX: Use video/webm as that is what MediaRecorder produces
  parts.push({ inlineData: { mimeType: "video/webm", data: mediaBase64 } });

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
    
    // STRICT MODE: If nextQuestion is missing, do NOT fallback. Let UI handle error.
    if (!json.nextQuestion) {
        throw new Error("AI failed to generate a follow-up question.");
    }

    return json;
  } catch (error) {
    console.error("Fast Gen Error:", error);
    return {
      transcript: "(Error analyzing audio)",
      answerQuality: "Basic",
      nextQuestion: "I encountered a technical glitch analyzing your audio. Please check your microphone and try again.",
      nextComplexity: "Basic"
    };
  }
};

// Specialized: Code Forensics
export const analyzeCodeSnippet = async (
    code: string, 
    context: InterviewContextData
): Promise<CodeAnalysisData> => {
    const ai = getAI();
    const model = "gemini-3-pro-preview";

    const prompt = `
    ROLE: Expert Code Reviewer & Algorithm Analyst.
    TASK: Analyze the following code snippet provided by a candidate during an interview.
    
    CODE:
    ${code}
    
    REQUIREMENTS:
    1. Determine Time & Space Complexity (Big O).
    2. Identify potential bugs or edge cases.
    3. Suggest improvements.
    4. Score the code quality (0-100).
    5. Check against uploaded Knowledge Base standards if applicable.
    
    OUTPUT JSON ONLY.
    `;

    // Add context to code analysis
    const parts: any[] = [{ text: prompt }];
    if (context.knowledgeBase) parts.push(...attachFilePart(context.knowledgeBase, "Coding Standards / Knowledge Base"));

    try {
        const response = await ai.models.generateContent({
            model,
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        language: { type: Type.STRING },
                        timeComplexity: { type: Type.STRING },
                        spaceComplexity: { type: Type.STRING },
                        bugs: { type: Type.ARRAY, items: { type: Type.STRING } },
                        suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                        score: { type: Type.NUMBER }
                    }
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("Code Analysis Error", e);
        return {
            language: "Unknown", timeComplexity: "?", spaceComplexity: "?",
            bugs: ["Analysis Failed"], suggestions: [], score: 0
        };
    }
};

// FEATURE: Technical Copilot - Generate Coding Challenge
export const generateCodingChallenge = async (context: InterviewContextData): Promise<CodingChallenge> => {
  const ai = getAI();
  const model = "gemini-3-pro-preview";

  const prompt = `
  ROLE: Technical Lead / Hiring Manager.
  TASK: Create a relevant Coding Challenge for the candidate based on their profile, the JD, and Company Knowledge Base.
  
  GOAL:
  - The problem should test core skills required in the Job Description.
  - It should align with the technical stack mentioned in the Knowledge Base (if provided).
  - It should be solvable in 10-15 minutes.
  - Provide a "Solution Key" for the non-technical interviewer.
  
  OUTPUT JSON ONLY.
  `;

  const parts: any[] = [{ text: prompt }];
  if (context.jobDescription) parts.push(...attachFilePart(context.jobDescription, "Job Description"));
  if (context.resume) parts.push(...attachFilePart(context.resume, "Candidate Resume"));
  if (context.knowledgeBase) parts.push(...attachFilePart(context.knowledgeBase, "Company Knowledge Base"));

  try {
    const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    difficulty: { type: Type.STRING, enum: ["Intermediate", "Expert"] },
                    solutionCode: { type: Type.STRING },
                    expectedTimeComplexity: { type: Type.STRING },
                    keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Challenge Gen Error", error);
    // STRICT MODE: No fake data. If API fails, return explicit error state.
    return {
        title: "Generation Failed",
        description: "The AI Service could not generate a challenge at this time. Please check your network connection or API quota.",
        difficulty: "Intermediate",
        solutionCode: "// Error: Generation failed.",
        expectedTimeComplexity: "N/A",
        keyConcepts: ["Service Unavailable"]
    };
  }
};

// PHASE 2: DEEP execution (Integrity, Sentiment, Skills, Code)
export const analyzeResponseDeeply = async (
  context: InterviewContextData,
  transcript: string,
  mediaBase64: string,
  videoFrameBase64: string,
  previousQuestion: string,
  submittedCode?: string
): Promise<AnalysisMetrics> => {
  const ai = getAI();
  const model = "gemini-3-pro-preview"; 

  // Quick exit for bad data
  if (!transcript || transcript.includes("(No audible response detected)") || transcript.includes("(Error")) {
       return {
        technicalAccuracy: 0, communicationClarity: 0, relevance: 0, sentiment: "Neutral",
        deceptionProbability: 0, paceOfSpeech: "Normal", starMethodAdherence: false,
        keySkillsDemonstrated: [], improvementAreas: ["No Audio Data"],
        integrity: { status: "Clean" }, answerQuality: "Basic"
    };
  }

  let codeAnalysis: CodeAnalysisData | undefined = undefined;
  if (submittedCode && submittedCode.length > 10) {
      codeAnalysis = await analyzeCodeSnippet(submittedCode, context);
  }

  const prompt = `
  ROLE: You are 'ProbeLensAI' Forensic Analyst.
  
  INPUT DATA:
  - Question Asked: "${previousQuestion}"
  - Candidate Transcript: "${transcript}"
  ${submittedCode ? `- Code Submitted: Yes (See Separate Analysis)` : ''}
  
  TASK:
  1. INTEGRITY CHECK (Cheating Detection):
     - Check the attached video frame: Are eyes darting? Is a phone visible?
     - Check the audio: Are there typing sounds? Is the voice robotic?
  
  2. CONTENT ANALYSIS:
     - Compare the transcript against the Candidate's Resume and Job Description and Knowledge Base. Does it align?
     - Verify technical accuracy (0-100).
     - Assess sentiment (Confidence vs Anxiety).
     - Identify Key Skills mentioned.

  OUTPUT JSON ONLY.
  `;

  const parts: any[] = [{ text: prompt }];
  
  // Attach Context
  if (context.resume) parts.push(...attachFilePart(context.resume, "Candidate Resume"));
  if (context.jobDescription) parts.push(...attachFilePart(context.jobDescription, "Job Description"));
  if (context.knowledgeBase) parts.push(...attachFilePart(context.knowledgeBase, "Knowledge Base"));

  // Re-attach video/audio
  parts.push({ inlineData: { mimeType: "video/webm", data: mediaBase64 } });
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

    const json = JSON.parse(response.text || "{}");
    return { ...json, codeAnalysis };

  } catch (error) {
    console.error("Deep Analysis Error:", error);
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
  const model = "gemini-3-pro-preview";

  // REAL-TIME GUARDRAIL:
  const validTurns = history.filter(t => 
    t.transcript && 
    t.transcript.length > 5 && 
    !t.transcript.includes("(Audio transcription failed)") &&
    !t.transcript.includes("(No audible response detected)")
  );

  if (validTurns.length === 0) {
      return {
        overallScore: 0,
        integrityScore: 0,
        skillDepthBreakdown: { basic: 0, intermediate: 0, expert: 0 },
        categoryScores: {
          subjectKnowledge: 0, behavioral: 0, functional: 0, 
          nonFunctional: 0, communication: 0, technical: 0, coding: 0
        },
        summary: "Interview ended without any valid candidate conversation. No data to analyze.",
        psychologicalProfile: "N/A",
        recommendation: 'NO_HIRE',
        turns: []
      };
  }

  const conversationLog = validTurns.map((t, i) => `
    [Turn ${i+1} | Level: ${t.questionComplexity}]
    Q: ${t.question}
    A: ${t.transcript}
    ${t.submittedCode ? `[CODE SUBMITTED]: ${t.submittedCode.substring(0, 200)}...` : ''}
    [Metrics] Accuracy: ${t.analysis.technicalAccuracy}, Integrity: ${t.analysis.integrity.status}, Quality: ${t.analysis.answerQuality}
  `).join("\n");

  const prompt = `
    Generate the "ProbeLensAI Final Decision Report" for ${context.candidateName}.
    
    INPUT: Full Interview Log below.
    ${conversationLog}
    
    TASKS:
    1. Calculate scores based STRICTLY on the conversation log above.
    2. Consider CODE QUALITY if code was submitted.
    3. Write a decisive summary.
    
    OUTPUT JSON ONLY.
    `;

  const parts: any[] = [{ text: prompt }];

  if (context.resume) parts.push(...attachFilePart(context.resume, "Resume Reference"));
  if (context.jobDescription) parts.push(...attachFilePart(context.jobDescription, "Job Requirements"));
  if (context.knowledgeBase) parts.push(...attachFilePart(context.knowledgeBase, "Knowledge Base"));

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
                  technical: { type: Type.NUMBER },
                  coding: { type: Type.NUMBER }
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
      return { ...json, turns: validTurns };
  } catch (error) {
      console.error("Gemini API Error in Report:", error);
      throw error;
  }
};
