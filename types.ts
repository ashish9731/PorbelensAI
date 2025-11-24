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

export interface AnalysisMetrics {
  technicalAccuracy: number;
  communicationClarity: number;
  relevance: number;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  deceptionProbability: number; // 0-100
  keySkillsDemonstrated: string[];
  improvementAreas: string[];
}

export interface InterviewTurn {
  id: number;
  question: string;
  answerAudioBase64?: string; // Storing base64 of audio blob
  answerVideoFrameBase64?: string; // Snapshot of video for facial analysis
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
  recommendation: 'HIRE' | 'NO_HIRE' | 'STRONG_HIRE' | 'MAYBE';
  turns: InterviewTurn[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'model';
  text: string;
}