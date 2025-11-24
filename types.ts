
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

export interface CandidateProfile {
  id: string;
  name: string;
  resume: FileData;
  status: 'READY' | 'COMPLETED';
}

export interface InterviewBatch {
  id: string;
  jobTitle: string;
  jobDescription: FileData;
  candidates: CandidateProfile[];
  createdAt: number;
}

export type AnswerQuality = 'Basic' | 'Intermediate' | 'Expert';
export type IntegrityStatus = 'Clean' | 'Suspicious';
export type QuestionComplexity = 'Basic' | 'Intermediate' | 'Expert';

export interface CodeAnalysisData {
  language: string;
  timeComplexity: string; // e.g. O(n)
  spaceComplexity: string; // e.g. O(1)
  bugs: string[];
  suggestions: string[];
  score: number; // 0-100
}

export interface CodingChallenge {
  title: string;
  description: string;
  difficulty: 'Intermediate' | 'Expert';
  solutionCode: string; // The correct code
  expectedTimeComplexity: string;
  keyConcepts: string[];
}

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
  codeAnalysis?: CodeAnalysisData; // Optional, only if code was submitted this turn
}

export interface InterviewTurn {
  id: number;
  question: string;
  questionComplexity: QuestionComplexity;
  answerAudioBase64?: string; 
  answerVideoFrameBase64?: string;
  transcript: string;
  submittedCode?: string; // The raw code text
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
    coding: number; // New Category
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
