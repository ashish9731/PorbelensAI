
import React, { useState, useEffect } from 'react';
import { Icons } from '../constants';
import { AppStage, InterviewContextData, InterviewBatch, CandidateProfile } from '../types';
import { processFile } from '../utils';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { analyzeResumeMatch } from '../services/geminiService';

interface SetupStageProps {
  setContext: (data: InterviewContextData) => void;
  setStage: (stage: AppStage) => void;
  darkMode: boolean;
  toggleTheme: () => void;
}

const SetupStage: React.FC<SetupStageProps> = ({ setContext, setStage, darkMode, toggleTheme }) => {
  // Batch State
  const [batches, setBatches] = useState<InterviewBatch[]>([]);
  
  // Form State for New Batch
  const [jobTitle, setJobTitle] = useState('');
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [kbFile, setKbFile] = useState<File | null>(null); // Knowledge Base State
  const [resumeFiles, setResumeFiles] = useState<FileList | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Helper to process analysis sequentially to avoid Rate Limits
  const processBatchAnalysis = async (batchId: string, candidates: CandidateProfile[], jdData: any) => {
      // Create a local copy to iterate
      const queue = [...candidates];
      setApiError(null);

      for (const candidate of queue) {
          try {
              // 1. Set status to analyzing in UI
              setBatches(prev => prev.map(b => {
                  if (b.id !== batchId) return b;
                  return {
                      ...b,
                      candidates: b.candidates.map(c => c.id === candidate.id ? { ...c, isAnalyzing: true } : c)
                  };
              }));

              // 2. Perform Real AI Analysis
              // We add a small delay to be safe with API quotas
              await new Promise(r => setTimeout(r, 500)); 
              const analysis = await analyzeResumeMatch(candidate.resume, jdData);

              // 3. Update result
              setBatches(prev => prev.map(b => {
                  if (b.id !== batchId) return b;
                  return {
                      ...b,
                      candidates: b.candidates.map(c => 
                          c.id === candidate.id 
                          ? { ...c, analysis, isAnalyzing: false } 
                          : c
                      )
                  };
              }));

          } catch (e: any) {
              console.error(`Analysis failed for ${candidate.name}`, e);
              if (e.message.includes("403") || e.message.includes("leaked")) {
                  setApiError(e.message); // Show global API error
              }

              // Set to error state but don't crash
              setBatches(prev => prev.map(b => {
                  if (b.id !== batchId) return b;
                  return {
                      ...b,
                      candidates: b.candidates.map(c => 
                          c.id === candidate.id 
                          ? { ...c, isAnalyzing: false } 
                          : c
                      )
                  };
              }));
          }
      }
  };

  // Helper to create a batch
  const handleCreateBatch = async () => {
    if (!jobTitle || !jdFile || !resumeFiles || resumeFiles.length === 0) {
        setError("Please provide a Job Title, JD, and at least one Resume.");
        return;
    }

    setIsProcessing(true);
    setError(null);
    setApiError(null);

    try {
        // 1. Process JD
        const jdData = await processFile(jdFile);

        // 2. Process KB (Optional)
        let kbData = undefined;
        if (kbFile) {
            kbData = await processFile(kbFile);
        }
        
        // 3. Process Resumes (Initial Load)
        const candidates: CandidateProfile[] = [];
        for (let i = 0; i < resumeFiles.length; i++) {
            const file = resumeFiles[i];
            const resumeData = await processFile(file);
            candidates.push({
                id: Math.random().toString(36).substr(2, 9),
                name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension for name
                resume: resumeData,
                status: 'READY',
                isAnalyzing: false // Start as false, the sequencer will toggle it
            });
        }

        const newBatch: InterviewBatch = {
            id: Date.now().toString(),
            jobTitle,
            jobDescription: jdData,
            knowledgeBase: kbData, // Save KB to batch
            candidates,
            createdAt: Date.now()
        };

        setBatches(prev => [newBatch, ...prev]);
        
        // 4. Trigger Sequential Analysis
        // Do not await this, let it run in background updates
        processBatchAnalysis(newBatch.id, candidates, jdData);

        // Reset Form
        setJobTitle('');
        setJdFile(null);
        setKbFile(null);
        setResumeFiles(null);

    } catch (err: any) {
        console.error("Batch creation failed", err);
        setError("Failed to process files. Ensure they are PDF or Text.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleLaunchInterview = (batch: InterviewBatch, candidate: CandidateProfile) => {
      // SET GLOBAL CONTEXT FOR THE AI
      // This ensures no fake data - we are injecting specific resume & JD & KB
      setContext({
          candidateName: candidate.name,
          jobDescription: batch.jobDescription,
          resume: candidate.resume,
          knowledgeBase: batch.knowledgeBase || null // Inject KB
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
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div 
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setStage(AppStage.HOME)}
          >
            <div className="bg-cyan-500 p-1.5 rounded-lg">
                <Icons.Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">ProbeLensAI</span>
          </div>
          <div className="flex items-center space-x-3">
             <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition text-slate-900 dark:text-white">
                {darkMode ? <Icons.Sun className="w-5 h-5" /> : <Icons.Moon className="w-5 h-5" />}
             </button>
             <button onClick={handleSignOut} className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                 Sign Out
             </button>
          </div>
        </div>
      </div>

      <div className="flex-grow max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Ingestion Engine */}
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center mb-6 text-slate-800 dark:text-white">
                    <Icons.Layers className="w-5 h-5 mr-2 text-cyan-600" />
                    <h2 className="text-lg font-bold">Create Job Batch</h2>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Job Role / Title</label>
                        <input 
                            type="text"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            placeholder="e.g. Senior React Developer"
                            className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Job Description (JD)</label>
                        <div className="mt-1 relative group">
                            <input 
                                type="file" 
                                onChange={(e) => e.target.files && setJdFile(e.target.files[0])}
                                accept=".pdf,.txt,.md"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={`border-2 border-dashed rounded-lg p-4 flex items-center justify-center transition-colors ${jdFile ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-slate-300 dark:border-slate-700 hover:border-cyan-500'}`}>
                                {jdFile ? (
                                    <div className="flex items-center text-green-600 text-sm font-medium">
                                        <Icons.CheckCircle className="w-4 h-4 mr-2" /> {jdFile.name}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-slate-400">
                                        <Icons.FileText className="w-6 h-6 mb-1" />
                                        <span className="text-xs">Upload JD (PDF/Text)</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Knowledge Base Input */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between">
                            Knowledge Base
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-400">Optional</span>
                        </label>
                        <div className="mt-1 relative group">
                            <input 
                                type="file" 
                                onChange={(e) => e.target.files && setKbFile(e.target.files[0])}
                                accept=".pdf,.txt,.md"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={`border-2 border-dashed rounded-lg p-4 flex items-center justify-center transition-colors ${kbFile ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-slate-300 dark:border-slate-700 hover:border-cyan-500'}`}>
                                {kbFile ? (
                                    <div className="flex items-center text-blue-600 text-sm font-medium">
                                        <Icons.CheckCircle className="w-4 h-4 mr-2" /> {kbFile.name}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-slate-400">
                                        <Icons.BookOpen className="w-6 h-6 mb-1" />
                                        <span className="text-xs">Upload KB (Docs/Repo)</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Candidate Resumes (Batch)</label>
                        <div className="mt-1 relative group">
                            <input 
                                type="file" 
                                onChange={(e) => setResumeFiles(e.target.files)}
                                accept=".pdf,.txt,.md"
                                multiple
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={`border-2 border-dashed rounded-lg p-8 flex items-center justify-center transition-colors ${resumeFiles && resumeFiles.length > 0 ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-slate-300 dark:border-slate-700 hover:border-cyan-500'}`}>
                                {resumeFiles && resumeFiles.length > 0 ? (
                                    <div className="text-center">
                                        <div className="flex items-center justify-center text-green-600 text-sm font-medium mb-1">
                                            <Icons.CheckCircle className="w-4 h-4 mr-2" /> {resumeFiles.length} Resumes Selected
                                        </div>
                                        <p className="text-xs text-slate-500">Ready to process</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-slate-400">
                                        <Icons.Upload className="w-8 h-8 mb-2" />
                                        <span className="text-sm font-medium">Bulk Upload Resumes</span>
                                        <span className="text-xs mt-1">Drag & drop or click to select multiple</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs rounded-lg flex items-center">
                            <Icons.AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" /> {error}
                        </div>
                    )}
                    
                    {apiError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs rounded-lg flex items-center border border-red-200">
                            <Icons.AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" /> 
                            <span>
                                <strong>API ERROR:</strong> {apiError}
                            </span>
                        </div>
                    )}

                    <button 
                        onClick={handleCreateBatch}
                        disabled={isProcessing}
                        className="w-full py-3 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl font-bold transition shadow-lg flex items-center justify-center"
                    >
                        {isProcessing ? <Icons.Loader2 className="animate-spin w-5 h-5" /> : "Queue Batch & Analyze"}
                    </button>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: Queue Management */}
        <div className="lg:col-span-8 space-y-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                <Icons.Briefcase className="w-6 h-6 mr-2" /> Interview Queue
            </h2>
            
            {batches.length === 0 ? (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 flex flex-col items-center justify-center text-slate-400">
                    <Icons.Layers className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No Active Batches</p>
                    <p className="text-sm">Create a Job Batch on the left to get started.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {batches.map((batch) => (
                        <div key={batch.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom duration-500">
                            {/* Batch Header */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{batch.jobTitle}</h3>
                                    <p className="text-xs text-slate-500 flex items-center mt-1">
                                        <Icons.FileText className="w-3 h-3 mr-1" /> {batch.jobDescription.name}
                                        {batch.knowledgeBase && (
                                            <>
                                                <span className="mx-2">•</span>
                                                <Icons.BookOpen className="w-3 h-3 mr-1 text-blue-500" /> {batch.knowledgeBase.name}
                                            </>
                                        )}
                                        <span className="mx-2">•</span>
                                        {batch.candidates.length} Candidates
                                    </p>
                                </div>
                                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-bold">
                                    Active
                                </div>
                            </div>

                            {/* Candidate List */}
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {batch.candidates.map((candidate) => (
                                    <div key={candidate.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition gap-4">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold flex-shrink-0">
                                                {candidate.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{candidate.name}</p>
                                                <p className="text-xs text-slate-500 flex items-center mb-1">
                                                    <Icons.FileText className="w-3 h-3 mr-1" /> {candidate.resume.name}
                                                </p>
                                                {/* Pre-Interview Analysis Tags */}
                                                {candidate.isAnalyzing ? (
                                                    <span className="text-[10px] text-cyan-600 flex items-center animate-pulse">
                                                        <Icons.Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analyzing Match...
                                                    </span>
                                                ) : candidate.analysis ? (
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${getRecommendationColor(candidate.analysis.recommendation)}`}>
                                                            {candidate.analysis.recommendation}
                                                        </span>
                                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center">
                                                            <Icons.FileText className="w-3 h-3 mr-1" /> Match: {candidate.analysis.resumeScore}%
                                                        </span>
                                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center">
                                                            <Icons.CheckCircle className="w-3 h-3 mr-1" /> ATS: {candidate.analysis.atsScore}%
                                                        </span>
                                                        {candidate.analysis.keyGap && candidate.analysis.keyGap !== 'None' && (
                                                            <span className="text-[10px] bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded text-red-500 flex items-center">
                                                                ! Gap: {candidate.analysis.keyGap.substring(0, 30)}...
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400">Queued</span>
                                                )}
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleLaunchInterview(batch, candidate)}
                                            className="px-4 py-2 bg-slate-900 dark:bg-cyan-600 hover:bg-slate-800 dark:hover:bg-cyan-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center space-x-2 transition transform active:scale-95 whitespace-nowrap self-start md:self-center"
                                        >
                                            <span>Start Interview</span>
                                            <Icons.ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default SetupStage;
