import React, { useState, useRef } from 'react';
import { AppStage, InterviewContextData, InterviewTurn } from '../types';
import WebcamRecorder, { WebcamRef } from './WebcamRecorder';
import { analyzeAndNextQuestion } from '../services/geminiService';
import { blobToBase64 } from '../utils';
import { Icons } from '../constants';

interface InterviewStageProps {
  context: InterviewContextData;
  setHistory: React.Dispatch<React.SetStateAction<InterviewTurn[]>>;
  history: InterviewTurn[];
  setStage: (stage: AppStage) => void;
  darkMode: boolean;
  toggleTheme: () => void;
}

const InterviewStage: React.FC<InterviewStageProps> = ({ context, setHistory, history, setStage, darkMode, toggleTheme }) => {
  // STRICT REQUIREMENT: First question is always "Tell me about yourself".
  const [currentQuestion, setCurrentQuestion] = useState<string>("Tell me about yourself in brief.");
  const [isRecording, setIsRecording] = useState(false);
  const [processingAnswer, setProcessingAnswer] = useState(false);
  const [showTips, setShowTips] = useState(true);
  
  const webcamRef = useRef<WebcamRef>(null);

  const handleStartRecording = () => {
    setIsRecording(true);
    webcamRef.current?.startRecording();
  };

  const handleStopAndAnalyze = () => {
    setIsRecording(false);
    webcamRef.current?.stopRecording(); // Triggers onDataAvailable
  };

  const processAnswerData = async (audioBlob: Blob) => {
    setProcessingAnswer(true);
    try {
      const audioBase64 = await blobToBase64(audioBlob);
      // Capture frame of the CANDIDATE (from screen or camera)
      const frameBase64 = webcamRef.current?.captureFrame() || "";

      // Add temp history for UI feedback
      // We create a placeholder turn while AI processes
      const tempTurn: InterviewTurn = {
          id: history.length + 1,
          question: currentQuestion,
          transcript: "Processing candidate response...",
          analysis: { 
              technicalAccuracy: 0, 
              communicationClarity: 0, 
              relevance: 0, 
              sentiment: 'Neutral', 
              deceptionProbability: 0, 
              keySkillsDemonstrated: [], 
              improvementAreas: [] 
          }
      };

      // AI Analysis
      const result = await analyzeAndNextQuestion(context, history, audioBase64, frameBase64);

      // Update with real data
      const turn: InterviewTurn = {
        id: history.length + 1,
        question: currentQuestion,
        answerAudioBase64: audioBase64, 
        transcript: result.transcript,
        analysis: result.analysis
      };

      setHistory(prev => [...prev, turn]);
      setCurrentQuestion(result.nextQuestion);
    } catch (err) {
      console.error("Analysis failed", err);
      // Show error to user instead of faking a response
      alert("Failed to analyze the response. Please check your internet connection and API key. Error: " + (err as Error).message);
      // Don't change the current question so the interviewer can retry
    } finally {
      setProcessingAnswer(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
      
      {/* Interviewer HUD Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
              <div 
                className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition mr-2 md:mr-4"
                onClick={() => setStage(AppStage.HOME)}
              >
                 <div className="bg-cyan-500 p-1 rounded-md">
                    <Icons.Brain className="w-4 h-4 text-white" />
                 </div>
                 <span className="text-lg font-bold tracking-tight hidden lg:block text-slate-900 dark:text-white">ProbeLensAI</span>
              </div>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

              <div className="bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-cyan-200 dark:border-cyan-800 flex items-center">
                <Icons.Cpu className="w-3 h-3 mr-1" /> Interviewer Mode
              </div>
              <h1 className="text-lg font-bold hidden md:block">
                  Evaluating: <span className="text-cyan-600 dark:text-cyan-400">{context.candidateName}</span>
              </h1>
          </div>
          <div className="flex items-center space-x-3">
             <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                {darkMode ? <Icons.Sun className="w-5 h-5" /> : <Icons.Moon className="w-5 h-5" />}
             </button>
             <button 
                onClick={() => setStage(AppStage.REPORT)} 
                className="text-xs bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white font-bold transition shadow-sm flex items-center"
              >
                <Icons.Square className="w-3 h-3 mr-1.5 fill-current" />
                End Interview
              </button>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 gap-6">
        
        {/* LEFT: Interviewer Actions & Script */}
        <div className="flex-1 flex flex-col space-y-6 order-2 lg:order-1">
          
          {/* The Prompt Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 lg:p-10 shadow-xl border-2 border-cyan-500/20 relative overflow-hidden flex flex-col min-h-[300px]">
            <div className="absolute top-0 right-0 p-4 opacity-5">
               <Icons.Brain className="w-32 h-32" />
            </div>
            
            <h3 className="text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center">
              <Icons.Briefcase className="w-4 h-4 mr-2" /> 
              Suggested Question
            </h3>
            
            <div className="flex-grow flex flex-col justify-center">
                {processingAnswer ? (
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <Icons.Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                        <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Analyzing response...</p>
                        <div className="flex gap-2 text-xs text-slate-400">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Checking Audio Tone</span>
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Detecting Deception</span>
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Validating Skills</span>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-left duration-300">
                        <p className="text-3xl md:text-4xl font-bold leading-snug text-slate-900 dark:text-white">
                        "{currentQuestion}"
                        </p>
                        <p className="mt-6 text-slate-500 dark:text-slate-400 text-sm italic border-l-2 border-slate-300 dark:border-slate-700 pl-3">
                            Ask this to the candidate, then click "Start Recording" to capture their answer.
                        </p>
                    </div>
                )}
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 gap-4">
             {!isRecording ? (
                <button 
                  onClick={handleStartRecording}
                  disabled={processingAnswer}
                  className="w-full group relative bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl py-6 shadow-lg transition-all transform hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <div className="flex items-center justify-center space-x-4">
                      <div className="bg-red-500 p-3 rounded-full animate-pulse group-hover:scale-110 transition shadow-red-500/50 shadow-lg">
                          <Icons.Mic className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                          <span className="block text-xs opacity-70 uppercase tracking-wider font-bold mb-0.5">Candidate is speaking</span>
                          <span className="block text-xl font-bold">Start Recording Answer</span>
                      </div>
                  </div>
                </button>
             ) : (
                <button 
                  onClick={handleStopAndAnalyze}
                  className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-6 shadow-lg shadow-red-600/20 transition-all transform hover:scale-[1.01] active:scale-95 flex items-center justify-center space-x-4"
                >
                  <div className="bg-white/20 p-3 rounded-full">
                      <Icons.Square className="w-6 h-6 fill-current" />
                  </div>
                   <div className="text-left">
                      <span className="block text-xs opacity-70 uppercase tracking-wider font-bold mb-0.5">Candidate Finished</span>
                      <span className="block text-xl font-bold">Stop & Analyze</span>
                  </div>
                </button>
             )}
          </div>

          {/* Tips */}
          {showTips && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-lg flex items-start space-x-3 relative">
                <button onClick={() => setShowTips(false)} className="absolute top-2 right-2 text-blue-400 hover:text-blue-600">✕</button>
                <Icons.AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                    <strong>Interviewer Guide:</strong> Use "Screen Share" on the right to record the Zoom/Meet window where the candidate is visible. The AI observes their facial expressions and tone from this feed.
                </p>
            </div>
          )}
        </div>

        {/* RIGHT: Candidate Feed (Recorder) */}
        <div className="lg:w-[480px] flex flex-col space-y-4 order-1 lg:order-2">
          <div className="bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-900/10 dark:ring-slate-700 relative aspect-video group">
             {/* The Recorder Component */}
             <WebcamRecorder 
                ref={webcamRef}
                onDataAvailable={processAnswerData}
                onFrameCapture={() => {}} 
                isRecording={isRecording}
            />
            
            {/* Overlay Status */}
            <div className="absolute top-4 left-4 flex space-x-2 pointer-events-none">
                <div className="bg-black/60 backdrop-blur px-2 py-1 rounded text-white text-[10px] font-mono border border-white/10 flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                    OBSERVING CANDIDATE
                </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Session Metrics</p>
                <Icons.Activity className="w-4 h-4 text-cyan-500" />
             </div>
             
             <div className="grid grid-cols-3 gap-4 divide-x divide-slate-100 dark:divide-slate-800">
                 <div className="text-center">
                     <span className="text-2xl font-bold text-slate-800 dark:text-white block">{history.length}</span>
                     <span className="text-[10px] text-slate-500 uppercase font-medium">Questions</span>
                 </div>
                 <div className="text-center">
                     <span className={`text-2xl font-bold block ${
                         history.length > 0 && history[history.length-1].analysis.sentiment === 'Negative' 
                         ? 'text-red-500' 
                         : 'text-green-500'
                     }`}>
                        {history.length > 0 ? history[history.length-1].analysis.sentiment : '-'}
                     </span>
                     <span className="text-[10px] text-slate-500 uppercase font-medium">Last Sentiment</span>
                 </div>
                 <div className="text-center">
                     <span className="text-2xl font-bold text-cyan-600 block">
                        {history.length > 0 ? history[history.length-1].analysis.technicalAccuracy + '%' : '-'}
                     </span>
                     <span className="text-[10px] text-slate-500 uppercase font-medium">Tech Score</span>
                 </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InterviewStage;