import React, { useState, useEffect } from 'react';
import { Icons } from '../constants';
import { AppStage, InterviewContextData, InterviewBatch, CandidateProfile, FileData } from '../types';
import { processFile } from '../utils';
import { auth } from '../services/firebase';
import { analyzeResumeMatch } from '../services/geminiService';
import { signOut } from "firebase/auth";

interface SetupStageProps {
  setContext: (data: InterviewContextData) => void;
  setStage: (stage: AppStage) => void;
  darkMode: boolean;
  toggleTheme: () => void;
}

const SetupStage: React.FC<SetupStageProps> = ({ setContext, setStage, darkMode, toggleTheme }) => {
  const [batches, setBatches] = useState<InterviewBatch[]>([]);
  const [jobTitle, setJobTitle] = useState('');
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [kbFiles, setKbFiles] = useState<FileList | null>(null);
  const [resumeFiles, setResumeFiles] = useState<FileList | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const processBatchAnalysis = async (batchId: string, candidates: CandidateProfile[], jdData: any) => {
      const queue = [...candidates];
      setApiError(null);

      for (const candidate of queue) {
          try {
              setBatches(prev => prev.map(b => {
                  if (b.id !== batchId) return b;
                  return {
                      ...b,
                      candidates: b.candidates.map(c => c.id === candidate.id ? { ...c, isAnalyzing: true } : c)
                  };
              }));

              await new Promise(r => setTimeout(r, 600)); // Rate limit buffer
              const analysis = await analyzeResumeMatch(candidate.resume, jdData);

              setBatches(prev => prev.map(b => {
                  if (b.id !== batchId) return b;
                  return {
                      ...b,
                      candidates: b.candidates.map(c => 
                          c.id === candidate.id ? { ...c, analysis, isAnalyzing: false } : c
                      )
                  };
              }));

          } catch (e: any) {
              console.error(`Analysis failed for ${candidate.name}`, e);
              if (e.message.includes("API KEY ERROR") || e.message.includes("403")) {
                  setApiError(e.message);
                  // CRITICAL: Stop the loop to prevent account ban or infinite errors
                  setBatches(prev => prev.map(b => {
                      if (b.id !== batchId) return b;
                      return {
                          ...b,
                          candidates: b.candidates.map(c => ({ ...c, isAnalyzing: false })) // Stop all spinners
                      };
                  }));
                  break; 
              }

              setBatches(prev => prev.map(b => {
                  if (b.id !== batchId) return b;
                  return {
                      ...b,
                      candidates: b.candidates.map(c => c.id === candidate.id ? { ...c, isAnalyzing: false } : c)
                  };
              }));
          }
      }
  };

  const handleCreateBatch = async () => {
    if (!jobTitle || !jdFile || !resumeFiles || resumeFiles.length === 0) {
        setError("Please provide a Job Title, JD, and at least one Resume.");
        return;
    }

    setIsProcessing(true);
    setError(null);
    setApiError(null);

    try {
        const jdData = await processFile(jdFile);
        let kbData: FileData[] = [];
        if (kbFiles && kbFiles.length > 0) {
            for (let i = 0; i < kbFiles.length; i++) {
                kbData.push(await processFile(kbFiles[i]));
            }
        }
        
        const candidates: CandidateProfile[] = [];
        for (let i = 0; i < resumeFiles.length; i++) {
            const file = resumeFiles[i];
            const resumeData = await processFile(file);
            candidates.push({
                id: Math.random().toString(36).substr(2, 9),
                name: file.name.replace(/\.[^/.]+$/, ""),
                resume: resumeData,
                status: 'READY',
                isAnalyzing: false
            });
        }

        const newBatch: InterviewBatch = {
            id: Date.now().toString(),
            jobTitle,
            jobDescription: jdData,
            knowledgeBase: kbData.length > 0 ? kbData : undefined,
            candidates,
            createdAt: Date.now()
        };

        setBatches(prev => [newBatch, ...prev]);
        // Skip resume analysis for faster processing
        // processBatchAnalysis(newBatch.id, candidates, jdData);

        setJobTitle('');
        setJdFile(null);
        setKbFiles(null);
        setResumeFiles(null);

    } catch (err: any) {
        console.error("Batch creation failed", err);
        setError("Failed to process files. Ensure they are PDF or Text.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleLaunchInterview = (batch: InterviewBatch, candidate: CandidateProfile) => {
      setContext({
          candidateName: candidate.name,
          jobDescription: batch.jobDescription,
          resume: candidate.resume,
          knowledgeBase: batch.knowledgeBase || null
      });
      setStage(AppStage.INTERVIEW);
  };

  const handleSignOut = () => {
      signOut(auth).then(() => {
          setStage(AppStage.HOME);
      });
  };

  const getRecommendationColor = (rec: string) => {
      if (rec === 'Interview') return 'bg-green-100 text-green-700 border-green-200';
      if (rec === 'Shortlist') return 'bg-blue-100 text-blue-700 border-blue-200';
      return 'bg-red-100 text-red-700 border-red-200';
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 flex flex-col">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setStage(AppStage.HOME)}>
            <div className="bg-cyan-500 p-1.5 rounded-lg">
                <Icons.Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">ProbeLensAI</span>
          </div>
          <div className="flex items-center space-x-3">
             <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition text-slate-900 dark:text-white">
                {darkMode ? <Icons.Sun className="w-5 h-5" /> : <Icons.Moon className="w-5 h-5" />}
             </button>
             <button onClick={handleSignOut} className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">Sign Out</button>
          </div>
        </div>
      </div>

      <div className="flex-grow max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                    <Icons.Briefcase className="w-5 h-5 mr-2 text-cyan-500" /> New Interview Batch
                </h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Job Role / Title</label>
                        <input type="text" className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white" placeholder="e.g. Senior React Developer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Job Description (PDF/Txt)</label>
                        <input type="file" accept=".pdf,.txt,.md" onChange={(e) => setJdFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 dark:file:bg-cyan-900/30 dark:file:text-cyan-400" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Knowledge Base (Optional)</label>
                        <input type="file" accept=".pdf,.txt,.md" multiple onChange={(e) => setKbFiles(e.target.files)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 dark:file:bg-slate-800 dark:file:text-slate-400" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Candidate Resumes (PDF)</label>
                        <input type="file" accept=".pdf,.txt" multiple onChange={(e) => setResumeFiles(e.target.files)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/30 dark:file:text-purple-400" />
                    </div>

                    {error && <p className="text-red-500 text-xs font-bold">{error}</p>}

                    <button onClick={handleCreateBatch} disabled={isProcessing} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:opacity-90 transition shadow-lg flex items-center justify-center">
                        {isProcessing ? <Icons.Loader2 className="w-5 h-5 animate-spin" /> : 'Analyze & Create Batch'}
                    </button>
                </div>
            </div>
            
            {apiError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <h3 className="text-red-700 dark:text-red-400 font-bold text-sm flex items-center"><Icons.AlertCircle className="w-4 h-4 mr-2"/> API Critical Error</h3>
                    <p className="text-xs text-red-600 dark:text-red-300 mt-1">{apiError}</p>
                </div>
            )}
        </div>

        <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                <Icons.Layers className="w-6 h-6 mr-2 text-purple-500" /> Active Recruitment Batches
            </h2>

            {batches.length === 0 && (
                <div className="text-center py-20 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800">
                    <Icons.Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No batches created yet.</p>
                </div>
            )}

            {batches.map(batch => (
                <div key={batch.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">{batch.jobTitle}</h3>
                            <p className="text-xs text-slate-500">{new Date(batch.createdAt).toLocaleDateString()} • {batch.candidates.length} Candidates</p>
                        </div>
                        <div className="flex space-x-2">
                             <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">JD Attached</span>
                             {batch.knowledgeBase && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">KB Attached</span>}
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {batch.candidates.map(candidate => (
                            <div key={candidate.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                                        {candidate.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{candidate.name}</h4>
                                        <div className="flex items-center space-x-2 mt-1">
                                            {candidate.isAnalyzing ? (
                                                <span className="text-[10px] text-cyan-600 flex items-center"><Icons.Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analyzing Resume...</span>
                                            ) : candidate.analysis ? (
                                                <>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getRecommendationColor(candidate.analysis.recommendation)}`}>{candidate.analysis.recommendation}</span>
                                                    <span className="text-[10px] text-slate-500">Match: {candidate.analysis.resumeScore}%</span>
                                                </>
                                            ) : <span className="text-[10px] text-slate-400">Pending Analysis</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    {candidate.analysis && (
                                        <div className="text-right hidden md:block">
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">Key Gap</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-[150px] truncate" title={candidate.analysis.keyGap}>{candidate.analysis.keyGap}</p>
                                        </div>
                                    )}
                                    <button onClick={() => handleLaunchInterview(batch, candidate)} disabled={candidate.isAnalyzing} className="px-4 py-2 bg-slate-900 dark:bg-cyan-600 hover:bg-slate-800 dark:hover:bg-cyan-700 text-white text-xs font-bold rounded-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                                        Start Interview <Icons.ArrowRight className="w-3 h-3 ml-2" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default SetupStage;