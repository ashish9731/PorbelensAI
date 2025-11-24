export enum AppStage {
  HOME = 'HOME',
  SETUP = 'SETUP',
  INTERVIEW = 'INTERVIEW',
  REPORT = 'REPORT'
}

export interface FileData {
  name: string;
  type: string;
  base64?: string;
  textContent?: string;
}

export interface InterviewContextData {
  jobDescription: FileData | null;
  resume: FileData | null;
  knowledgeBase: FileData | null;
  candidateName: string;
}

export type AnswerQuality = 'Basic' | 'Intermediate' | 'Expert';
export type IntegrityStatus = 'Clean' | 'Suspicious';
export type QuestionComplexity = 'Basic' | 'Intermediate' | 'Expert';

export interface AnalysisMetrics {
  technicalAccuracy: number; // 0-100
  communicationClarity: number; // 0-100
  relevance: number; // 0-100
  sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Anxious' | 'Confident' | 'Defensive';
  deceptionProbability: number; // 0-100
  paceOfSpeech: 'Slow' | 'Normal' | 'Fast' | 'Rushed';
  starMethodAdherence: boolean;
  keySkillsDemonstrated: string[];
  improvementAreas: string[];
  // New Advanced Metrics
  integrity: {
    status: IntegrityStatus;
    flaggedReason?: string; // e.g., "Eyes darting off-screen", "Robotic tone"
  };
  answerQuality: AnswerQuality;
}

export interface InterviewTurn {
  id: number;
  question: string;
  questionComplexity: QuestionComplexity;
  answerAudioBase64?: string; 
  answerVideoFrameBase64?: string;
  transcript: string;
  analysis: AnalysisMetrics;
  interviewerNotes?: string;
}

export interface ReportData {
  overallScore: number; // 0-100
  categoryScores: {
    subjectKnowledge: number;
    behavioral: number;
    functional: number;
    nonFunctional: number;
    communication: number;
    technical: number;
  };
  summary: string;
  psychologicalProfile: string;
  recommendation: 'HIRE' | 'NO_HIRE' | 'STRONG_HIRE' | 'MAYBE';
  turns: InterviewTurn[];
  // New Report Metrics
  integrityScore: number; // 100 = Honest, 0 = Cheated
  skillDepthBreakdown: {
    basic: number;
    intermediate: number;
    expert: number;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'model';
  text: string;
}