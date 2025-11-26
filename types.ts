import React from 'react';

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
  knowledgeBase: FileData[] | null;
  candidateName: string;
}

export interface PreInterviewAnalysis {
  resumeScore: number; // 0-100 (Match with JD)
  atsScore: number; // 0-100 (Formatting & Keyword Optimization)
  recommendation: 'Interview' | 'Shortlist' | 'Reject';
  keyGap: string;
}

export interface CandidateProfile {
  id: string;
  name: string;
  resume: FileData;
  status: 'READY' | 'COMPLETED';
  analysis?: PreInterviewAnalysis; // New Field
  isAnalyzing?: boolean; // UI State
}

export interface InterviewBatch {
  id: string;
  jobTitle: string;
  jobDescription: FileData;
  knowledgeBase?: FileData[];
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
  integrity: {
    status: IntegrityStatus;
    flaggedReason?: string;
  };
  answerQuality: AnswerQuality;
  codeAnalysis?: CodeAnalysisData;
}

export interface InterviewTurn {
  id: number;
  question: string;
  questionComplexity: QuestionComplexity;
  answerAudioBase64?: string; 
  answerVideoFrameBase64?: string;
  transcript: string;
  submittedCode?: string;
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
    coding: number;
  };
  summary: string;
  psychologicalProfile: string;
  recommendation: 'HIRE' | 'NO_HIRE' | 'STRONG_HIRE' | 'MAYBE';
  turns: InterviewTurn[];
  integrityScore: number;
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