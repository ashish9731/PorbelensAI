import { GoogleGenAI, Type } from "@google/genai";
import { InterviewContextData, InterviewTurn, AnalysisMetrics, ReportData, AnswerQuality, QuestionComplexity, CodeAnalysisData, CodingChallenge, PreInterviewAnalysis, FileData } from "../types";

const getAI = () => {
    // The API key must be obtained exclusively from the environment variable VITE_GEMINI_API_KEY
    const key = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!key) {
        throw new Error("MISSING API KEY: VITE_GEMINI_API_KEY is not set.");
    }
    return new GoogleGenAI({ apiKey: key });
}

// Helper to attach file parts correctly
const attachFilePart = (fileData: any, label: string) => {
    if (fileData.base64) {
        return [
            { text: `[SYSTEM: The user has uploaded a file for ${label}. Use this context strictly.]` },
            { inlineData: { mimeType: fileData.type, data: fileData.base64 } }
        ];
    } else if (fileData.textContent) {
        return [{ text: `${label.toUpperCase()} CONTENT:\n${fileData.textContent.substring(0, 20000)}` }];
    }
    return [];
};

// FEATURE: Pre-Interview Resume Analysis
export const analyzeResumeMatch = async (resume: FileData, jd: FileData): Promise<PreInterviewAnalysis> => {
    try {
        const ai = getAI();
        const model = "gemini-2.5-flash"; // Stable model for document analysis

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
        if (e.message.includes("403") || e.status === 403) {
            throw new Error("API KEY ERROR: Your key is invalid or blocked.");
        }
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
  try {
      const ai = getAI();
      const model = "gemini-2.0-flash"; // Even faster model for real-time interaction

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
      1. LISTEN to the attached video/audio clip.
      2. TRANSCRIBE the candidate's response.
         - If silent or empty, output exactly: "(No audible response detected)".
      3. EVALUATE the answer quality.
         - If candidate says they don't know or gives vague answers, decrease difficulty
         - If candidate answers confidently and correctly, maintain or increase difficulty
         - If candidate gives near-correct answers, maintain difficulty and probe deeper
      4. GENERATE the Next Question:
         - Must follow-up on their answer.
         - Use the JD and Resume context.
         - ADAPT difficulty based on answer quality:
           * If answer quality is "Basic", ask fundamental questions
           * If answer quality is "Intermediate", ask moderate complexity questions
           * If answer quality is "Expert", ask advanced questions
         - If candidate said they don't know, ask foundational questions on the topic

      OUTPUT JSON ONLY. Keep response concise and fast.
      `;

      const parts: any[] = [{ text: prompt }];
      
      if (context.jobDescription) parts.push(...attachFilePart(context.jobDescription, "Job Description"));
      if (context.resume) parts.push(...attachFilePart(context.resume, "Candidate Resume"));
      
      if (context.knowledgeBase && context.knowledgeBase.length > 0) {
          context.knowledgeBase.forEach((kb, index) => {
              parts.push(...attachFilePart(kb, `Company Knowledge Base (Part ${index + 1})`));
          });
      }
      
      // Attach Audio/Video
      parts.push({ inlineData: { mimeType: "video/webm", data: mediaBase64 } });

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
      
      if (!json.transcript || json.transcript.trim() === "") {
          json.transcript = "(No audible response detected)";
      }
      
      if (!json.nextQuestion) {
          json.nextQuestion = "Could you elaborate on that further?";
      }

      return json;
  } catch (error: any) {
    console.error("Fast Gen Error:", error);
    if (error.message.includes("403") || error.status === 403) {
        throw new Error("API KEY ERROR: Key blocked/invalid.");
    }
    throw error;
  }
};

// Specialized: Code Forensics
export const analyzeCodeSnippet = async (
    code: string, 
    context: InterviewContextData
): Promise<CodeAnalysisData> => {
    try {
        const ai = getAI();
        const model = "gemini-2.5-flash"; // Use Flash for code analysis speed

        const prompt = `
        ROLE: Expert Code Reviewer.
        TASK: Analyze this code snippet.
        
        CODE:
        ${code}
        
        OUTPUT JSON ONLY.
        `;

        const parts: any[] = [{ text: prompt }];
        if (context.knowledgeBase && context.knowledgeBase.length > 0) {
            context.knowledgeBase.forEach((kb, index) => {
                parts.push(...attachFilePart(kb, `Coding Standards / Knowledge Base (Part ${index + 1})`));
            });
        }

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
    } catch (e: any) {
        console.error("Code Analysis Error", e);
        return {
            language: "Unknown", timeComplexity: "?", spaceComplexity: "?",
            bugs: ["Analysis Failed"], suggestions: [], score: 0
        };
    }
};

// FEATURE: Technical Copilot - Generate Coding Challenge
export const generateCodingChallenge = async (context: InterviewContextData): Promise<CodingChallenge> => {
  try {
      const ai = getAI();
      const model = "gemini-3-pro-preview"; // Use Pro for creative task generation

      const prompt = `
      ROLE: Hiring Manager.
      TASK: Create a Coding Challenge based on the JD and Resume.
      GOAL: Solvable in 10 mins. Include a solution key.
      OUTPUT JSON ONLY.
      `;

      const parts: any[] = [{ text: prompt }];
      if (context.jobDescription) parts.push(...attachFilePart(context.jobDescription, "Job Description"));
      if (context.resume) parts.push(...attachFilePart(context.resume, "Candidate Resume"));
      
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
  } catch (error: any) {
    console.error("Challenge Gen Error", error);
    if (error.message.includes("403")) {
        throw new Error("API KEY ERROR: Key blocked/invalid.");
    }
    return {
        title: "Error Generating Challenge", 
        description: "API Access Failed. Please check your API key.", 
        difficulty: "Intermediate",
        solutionCode: "", 
        expectedTimeComplexity: "", 
        keyConcepts: []
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
  try {
      const ai = getAI();
      const model = "gemini-2.0-flash"; // Use faster Flash model for video analysis

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
      ROLE: Forensic Analyst.
      INPUT: Question: "${previousQuestion}". Transcript: "${transcript}".
      TASK:
      1. Check Video Frame for cheating (eyes off screen).
      2. Check Audio for robotic voice/typing.
      3. Analyze Content against Resume/JD.
      4. VERIFY transcription accuracy - if transcription seems incomplete or missing, flag it.
      5. PROVIDE correct answer or explanation for the question to help interviewer evaluate candidate.
      OUTPUT JSON ONLY. Keep response concise and fast.
      `;

      const parts: any[] = [{ text: prompt }];
      if (context.resume) parts.push(...attachFilePart(context.resume, "Candidate Resume"));
      if (context.jobDescription) parts.push(...attachFilePart(context.jobDescription, "Job Description"));
      
      parts.push({ inlineData: { mimeType: "video/webm", data: mediaBase64 } });
      parts.push({ inlineData: { mimeType: "image/jpeg", data: videoFrameBase64 } });

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
              answerQuality: { type: Type.STRING, enum: ["Basic", "Intermediate", "Expert"] },
              correctAnswer: { type: Type.STRING }
            }
          }
        }
      });

      const json = JSON.parse(response.text || "{}");
      return { ...json, codeAnalysis };

  } catch (error: any) {
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
  try {
      const ai = getAI();
      const model = "gemini-3-pro-preview"; // Use Pro for high-quality report writing

      const validTurns = history.filter(t => 
        t.transcript && t.transcript.length > 5 && 
        !t.transcript.includes("(No audible response detected)")
      );

      if (validTurns.length === 0) {
          return {
            overallScore: 0, integrityScore: 0, skillDepthBreakdown: { basic: 0, intermediate: 0, expert: 0 },
            categoryScores: { subjectKnowledge: 0, behavioral: 0, functional: 0, nonFunctional: 0, communication: 0, technical: 0, coding: 0 },
            summary: "No interview data collected.", psychologicalProfile: "N/A", recommendation: 'NO_HIRE', turns: []
          };
      }

      const prompt = `Generate Final Report for ${context.candidateName}. Based on this logs: ${JSON.stringify(validTurns.map(t=>({q:t.question, a:t.transcript, score:t.analysis.technicalAccuracy})))}. OUTPUT JSON.`;
      
      const parts: any[] = [{ text: prompt }];

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
              skillDepthBreakdown: { type: Type.OBJECT, properties: { basic: { type: Type.NUMBER }, intermediate: { type: Type.NUMBER }, expert: { type: Type.NUMBER } } },
              categoryScores: { type: Type.OBJECT, properties: { subjectKnowledge: { type: Type.NUMBER }, behavioral: { type: Type.NUMBER }, functional: { type: Type.NUMBER }, nonFunctional: { type: Type.NUMBER }, communication: { type: Type.NUMBER }, technical: { type: Type.NUMBER }, coding: { type: Type.NUMBER } } },
              summary: { type: Type.STRING },
              psychologicalProfile: { type: Type.STRING },
              recommendation: { type: Type.STRING, enum: ['HIRE', 'NO_HIRE', 'STRONG_HIRE', 'MAYBE'] }
            }
          }
        }
      });

      return { ...JSON.parse(response.text || "{}"), turns: validTurns };
  } catch (error: any) {
      console.error("Report Gen Error:", error);
      // Fallback report generation if AI fails
      const validTurns = history.filter(t => 
        t.transcript && t.transcript.length > 5 && 
        !t.transcript.includes("(No audible response detected)")
      );
      
      if (validTurns.length === 0) {
          return {
            overallScore: 0, integrityScore: 0, skillDepthBreakdown: { basic: 0, intermediate: 0, expert: 0 },
            categoryScores: { subjectKnowledge: 0, behavioral: 0, functional: 0, nonFunctional: 0, communication: 0, technical: 0, coding: 0 },
            summary: "No interview data collected.", psychologicalProfile: "N/A", recommendation: 'NO_HIRE', turns: []
          };
      }
      
      // Calculate average scores from turns
      const avgTechnical = validTurns.reduce((sum, turn) => sum + turn.analysis.technicalAccuracy, 0) / validTurns.length;
      const avgCommunication = validTurns.reduce((sum, turn) => sum + turn.analysis.communicationClarity, 0) / validTurns.length;
      
      return {
        overallScore: Math.round((avgTechnical + avgCommunication) / 2), 
        integrityScore: 100 - Math.round(validTurns.reduce((sum, turn) => sum + turn.analysis.deceptionProbability, 0) / validTurns.length),
        skillDepthBreakdown: { 
          basic: validTurns.filter(t => t.analysis.answerQuality === 'Basic').length,
          intermediate: validTurns.filter(t => t.analysis.answerQuality === 'Intermediate').length,
          expert: validTurns.filter(t => t.analysis.answerQuality === 'Expert').length
        },
        categoryScores: { 
          subjectKnowledge: Math.round(avgTechnical), 
          behavioral: 70, 
          functional: Math.round(avgTechnical), 
          nonFunctional: 60, 
          communication: Math.round(avgCommunication), 
          technical: Math.round(avgTechnical), 
          coding: 50
        },
        summary: `Candidate answered ${validTurns.length} questions with an average technical accuracy of ${Math.round(avgTechnical)}%`, 
        psychologicalProfile: "Based on limited data - candidate shows normal interview behavior",
        recommendation: avgTechnical > 70 ? 'HIRE' : 'NO_HIRE',
        turns: validTurns
      };
  }
};