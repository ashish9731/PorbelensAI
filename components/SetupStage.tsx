import React, { useState } from 'react';
import { Icons } from '../constants';
import { AppStage, InterviewContextData } from '../types';
import { processFile } from '../utils';

interface SetupStageProps {
  setContext: (data: InterviewContextData) => void;
  setStage: (stage: AppStage) => void;
  darkMode: boolean;
  toggleTheme: () => void;
}

const SetupStage: React.FC<SetupStageProps> = ({ setContext, setStage, darkMode, toggleTheme }) => {
  const [candidateName, setCandidateName] = useState('');
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [kbFile, setKbFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (!candidateName || !jdFile || !resumeFile) return;

    setIsProcessing(true);
    setError(null);
    try {
      const jdData = await processFile(jdFile);
      const resumeData = await processFile(resumeFile);
      const kbData = kbFile ? await processFile(kbFile) : null;

      setContext({
        candidateName,
        jobDescription: jdData,
        resume: resumeData,
        knowledgeBase: kbData
      });
      
      setStage(AppStage.INTERVIEW);
    } catch (error: any) {
      console.error("Error processing files", error);
      setError(error.message || "Failed to process files. Please upload valid PDF or Text files.");
    } finally {
      setIsProcessing(false);
    }
  };

  const FileInput = ({ label, file, setFile, optional = false }: { label: string, file: File | null, setFile: (f: File) => void, optional?: boolean }) => (
    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6 flex flex-col items-center justify-center hover:bg-white dark:hover:bg-slate-800 hover:border-cyan-500 dark:hover:border-cyan-500 transition cursor-pointer relative group h-40">
      <input 
        type="file" 
        onChange={(e) => {
            setError(null);
            if (e.target.files) setFile(e.target.files[0]);
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        accept=".pdf,.txt,.md"
      />
      <Icons.Upload className={`w-8 h-8 mb-2 ${file ? 'text-green-500' : 'text-slate-400 group-hover:text-cyan-500'}`} />
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 text-center truncate w-full px-2">{file ? file.name : `Upload ${label}`}</p>
      <p className="text-xs text-slate-400 mt-1">PDF or Text</p>
      {optional && !file && <span className="text-xs text-slate-500 mt-1">(Optional)</span>}
      {file && <div className="absolute top-2 right-2 text-green-500"><Icons.CheckCircle className="w-4 h-4"/></div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div 
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setStage(AppStage.HOME)}
          >
            <Icons.Brain className="w-6 h-6 text-cyan-500" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">ProbeLensAI</h1>
          </div>
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition text-slate-900 dark:text-white">
            {darkMode ? <Icons.Sun className="w-5 h-5" /> : <Icons.Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="bg-slate-100 dark:bg-slate-800 p-8 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
              <Icons.Settings className="mr-3 w-6 h-6" /> Configuration
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Prepare the environment for the candidate. This section is for the **Recruiter**.
            </p>
          </div>
          
          <div className="p-6 md:p-8 space-y-8">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Candidate Full Name</label>
              <input 
                type="text" 
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white transition"
                placeholder="e.g. Alex Johnson"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FileInput label="Job Description" file={jdFile} setFile={setJdFile} />
              <FileInput label="Candidate Resume" file={resumeFile} setFile={setResumeFile} />
              <FileInput label="Knowledge Base" file={kbFile} setFile={setKbFile} optional />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative flex items-center" role="alert">
                  <Icons.AlertCircle className="w-5 h-5 mr-2" />
                  <span className="block sm:inline">{error}</span>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start space-x-3 border border-blue-100 dark:border-blue-800">
               <Icons.Lock className="text-blue-600 dark:text-blue-400 w-5 h-5 mt-0.5 flex-shrink-0" />
               <div className="text-sm text-blue-800 dark:text-blue-200">
                 <p className="font-semibold mb-1">Next Step: Candidate Session</p>
                 <p>Clicking "Launch" will switch the view to the **Candidate Interface**. The System will generate the first question automatically based on the JD/Resume overlap. The webcam/screen recorder will activate for the candidate.</p>
               </div>
            </div>

            <div className="flex justify-end pt-4">
               <button
                 onClick={handleStart}
                 disabled={!candidateName || !jdFile || !resumeFile || isProcessing}
                 className={`flex items-center px-8 py-4 rounded-xl font-bold text-white transition-all transform hover:scale-[1.02] shadow-lg
                   ${(!candidateName || !jdFile || !resumeFile || isProcessing) 
                     ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500' 
                     : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'}`}
               >
                 {isProcessing ? (
                   <>
                    <Icons.Loader2 className="animate-spin mr-2" /> Initializing System...
                   </>
                 ) : (
                   <>
                     Launch Candidate Session <Icons.ArrowRight className="ml-2" />
                   </>
                 )}
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupStage;