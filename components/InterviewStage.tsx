
import React, { useState, useRef } from 'react';
import { AppStage, InterviewContextData, InterviewTurn, QuestionComplexity, CodingChallenge } from '../types';
import WebcamRecorder, { WebcamRef } from './WebcamRecorder';
import { generateFastNextQuestion, analyzeResponseDeeply, generateCodingChallenge } from '../services/geminiService';
import { blobToBase64 } from '../utils';
import { Icons } from '../constants';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';

interface InterviewStageProps {
  context: InterviewContextData;
  setHistory: React.Dispatch<React.SetStateAction<InterviewTurn[]>>;
  history: InterviewTurn[];
  setStage: (stage: AppStage) => void;
  darkMode: boolean;
  toggleTheme: () => void;
}

const InterviewStage: React.FC<InterviewStageProps> = ({ context, setHistory, history, setStage, darkMode, toggleTheme }) => {
  const [currentQuestion, setCurrentQuestion] = useState<string>("Tell me about yourself in brief.");
  const [currentComplexity, setCurrentComplexity] = useState<QuestionComplexity>('Basic');
  
  // Interaction Modes
  const [viewMode, setViewMode] = useState<'VIDEO' | 'CODE'>('VIDEO');
  const [codeBuffer, setCodeBuffer] = useState<string>('');

  // Technical Copilot State
  const [activeChallenge, setActiveChallenge] = useState<CodingChallenge | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [processingState, setProcessingState] = useState<'IDLE' | 'GENERATING_QUESTION' | 'ANALYZING_BACKGROUND'>('IDLE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const webcamRef = useRef<WebcamRef>(null);

  const handleSignOut = () => {
      signOut(auth).then(() => {
          setStage(AppStage.HOME);
      });
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setErrorMsg(null);
    webcamRef.current?.startRecording();
  };

  const handleStopAndAnalyze = () => {
    setIsRecording(false);
    webcamRef.current?.stopRecording(); // Triggers onDataAvailable
  };

  const handleGenerateChallenge = async () => {
      setIsGeneratingChallenge(true);
      try {
          const challenge = await generateCodingChallenge(context);
          setActiveChallenge(challenge);
          setCurrentQuestion(challenge.description); // Auto-set the question
          setCurrentComplexity(challenge.difficulty);
      } catch (e) {
          console.error("Challenge gen failed", e);
      } finally {
          setIsGeneratingChallenge(false);
      }
  };

  const processAnswerData = async (mediaBlob: Blob) => {
    // Validate Blob Size
    if (mediaBlob.size < 1000) {
        setErrorMsg("No audio detected. Please ensure the microphone is working.");
        setIsRecording(false);
        return;
    }

    setProcessingState('GENERATING_QUESTION');
    
    try {
      const mediaBase64 = await blobToBase64(mediaBlob);
      const frameBase64 = webcamRef.current?.captureFrame() || "";
      const codeSubmitted = viewMode === 'CODE' && codeBuffer.length > 5 ? codeBuffer : undefined;

      // Store context
      const thisTurnId = history.length + 1;
      const questionAsked = currentQuestion;
      const complexityAsked = currentComplexity;

      // PHASE 1: Fast Gen 
      const fastResult = await generateFastNextQuestion(context, history, mediaBase64);
      
      if (fastResult.transcript.includes("(No audible response") || fastResult.transcript.includes("(Error")) {
           const failedTurn: InterviewTurn = {
            id: thisTurnId,
            question: questionAsked,
            questionComplexity: complexityAsked,
            answerAudioBase64: mediaBase64,
            transcript: fastResult.transcript,
            submittedCode: codeSubmitted,
            analysis: { 
                technicalAccuracy: 0, communicationClarity: 0, relevance: 0, sentiment: 'Neutral', 
                deceptionProbability: 0, paceOfSpeech: 'Normal', starMethodAdherence: false,
                keySkillsDemonstrated: [], improvementAreas: ["No Speech Detected"],
                integrity: { status: 'Clean' }, answerQuality: 'Basic'
            }
          };
          setHistory(prev => [...prev, failedTurn]);
          setCurrentQuestion(fastResult.nextQuestion); 
          setProcessingState('IDLE');
          return;
      }

      // Create Turn
      const newTurn: InterviewTurn = {
        id: thisTurnId,
        question: questionAsked,
        questionComplexity: complexityAsked,
        answerAudioBase64: mediaBase64,
        transcript: fastResult.transcript,
        submittedCode: codeSubmitted,
        analysis: { 
            technicalAccuracy: 0, communicationClarity: 0, relevance: 0, sentiment: 'Neutral', 
            deceptionProbability: 0, paceOfSpeech: 'Normal', starMethodAdherence: false,
            keySkillsDemonstrated: [], improvementAreas: [],
            integrity: { status: 'Clean' }, answerQuality: fastResult.answerQuality
        }
      };

      setHistory(prev => [...prev, newTurn]);
      setCurrentQuestion(fastResult.nextQuestion);
      setCurrentComplexity(fastResult.nextComplexity);
      
      // Reset Code Buffer if submitted
      if (codeSubmitted) setCodeBuffer('');
      
      // PHASE 2: Deep Analysis
      setProcessingState('ANALYZING_BACKGROUND');
      
      analyzeResponseDeeply(context, fastResult.transcript, mediaBase64, frameBase64, questionAsked, codeSubmitted)
        .then((deepAnalysis) => {
            setHistory(prev => prev.map(turn => 
                turn.id === thisTurnId 
                ? { ...turn, analysis: deepAnalysis }
                : turn
            ));
            setProcessingState('IDLE');
        })
        .catch(err => {
            console.error("Background Analysis Failed", err);
            setProcessingState('IDLE');
        });
      
    } catch (err) {
      console.error("Critical Failure in Phase 1", err);
      setErrorMsg("Connection lost with AI service.");
      setProcessingState('IDLE');
    }
  };

  const getComplexityColor = (c: QuestionComplexity) => {
      switch(c) {
          case 'Expert': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300';
          case 'Intermediate': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300';
          default: return 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300';
      }
  };

  const lastAnalysis = history.length > 0 ? history[history.length - 1].analysis : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
      
      {/* Header */}
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
                <Icons.Cpu className="w-3 h-3 mr-1" /> HR Command Center
              </div>
          </div>
          <div className="flex items-center space-x-3">
             <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                {darkMode ? <Icons.Sun className="w-5 h-5" /> : <Icons.Moon className="w-5 h-5" />}
             </button>
             <button onClick={handleSignOut} className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                 Sign Out
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
        
        {/* LEFT: Action Area */}
        <div className="flex-1 flex flex-col space-y-6 order-2 lg:order-1">
          
          {/* Question Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 lg:p-10 shadow-xl border-2 border-cyan-500/20 relative overflow-hidden flex flex-col min-h-[300px]">
            <div className="absolute top-0 right-0 p-4 opacity-5">
               <Icons.Brain className="w-32 h-32" />
            </div>
            
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider flex items-center">
                    <Icons.Briefcase className="w-4 h-4 mr-2" /> 
                    AI Suggested Question
                </h3>
                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${getComplexityColor(currentComplexity)}`}>
                    Level: {currentComplexity}
                </span>
            </div>
            
            <div className="flex-grow flex flex-col justify-center">
                {processingState === 'GENERATING_QUESTION' ? (
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <Icons.Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                        <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Generating Adaptive Question...</p>
                        <span className="text-xs text-slate-400">Analyzing Audio & Response Quality...</span>
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-left duration-300">
                        <p className="text-2xl md:text-3xl font-bold leading-snug text-slate-900 dark:text-white">
                        "{currentQuestion}"
                        </p>
                        {errorMsg && (
                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center text-red-600 dark:text-red-400 text-sm">
                                <Icons.AlertCircle className="w-4 h-4 mr-2" />
                                {errorMsg}
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {processingState === 'ANALYZING_BACKGROUND' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800">
                    <div className="h-full bg-cyan-500 animate-progressBar"></div>
                </div>
            )}
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 gap-4">
             {!isRecording ? (
                <button 
                  onClick={handleStartRecording}
                  disabled={processingState === 'GENERATING_QUESTION'}
                  className="w-full group relative bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl py-6 shadow-lg transition-all transform hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <div className="flex items-center justify-center space-x-4">
                      <div className="bg-red-500 p-3 rounded-full animate-pulse group-hover:scale-110 transition shadow-red-500/50 shadow-lg">
                          <Icons.Mic className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                          <span className="block text-xs opacity-70 uppercase tracking-wider font-bold mb-0.5">Candidate Speaking</span>
                          <span className="block text-xl font-bold">Start Recording</span>
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
                      <span className="block text-xs opacity-70 uppercase tracking-wider font-bold mb-0.5">Finish Answer</span>
                      <span className="block text-xl font-bold">Analyze & Next</span>
                  </div>
                </button>
             )}
          </div>
        </div>

        {/* RIGHT: HR Intelligence Dashboard */}
        <div className="lg:w-[450px] flex flex-col space-y-4 order-1 lg:order-2">
          
          {/* TAB SELECTOR */}
          <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('VIDEO')}
                className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center space-x-2 transition ${viewMode === 'VIDEO' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                 <Icons.Video className="w-3 h-3" />
                 <span>Live Monitor</span>
              </button>
              <button 
                onClick={() => setViewMode('CODE')}
                className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center space-x-2 transition ${viewMode === 'CODE' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                 <Icons.Cpu className="w-3 h-3" />
                 <span>Code Copilot</span>
              </button>
          </div>

          {/* 1. VIEWPORT: Video or Code */}
          <div className="bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-900/10 dark:ring-slate-700 relative aspect-video group flex flex-col">
             
             {viewMode === 'VIDEO' ? (
                <>
                    <WebcamRecorder 
                        ref={webcamRef}
                        onDataAvailable={processAnswerData}
                        onFrameCapture={() => {}} 
                        isRecording={isRecording}
                    />
                    <div className="absolute top-4 left-4 flex space-x-2 pointer-events-none">
                        <div className="bg-black/60 backdrop-blur px-2 py-1 rounded text-white text-[10px] font-mono border border-white/10 flex items-center">
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                            LIVE MONITOR
                        </div>
                    </div>
                </>
             ) : (
                 <div className="w-full h-full bg-slate-900 flex flex-col">
                    {/* Copilot Header */}
                    <div className="bg-slate-800 px-4 py-2 flex justify-between items-center border-b border-slate-700 shrink-0">
                        <span className="text-[10px] font-mono text-cyan-400">TECHNICAL_COPILOT_V2</span>
                        <button 
                            onClick={handleGenerateChallenge}
                            disabled={isGeneratingChallenge}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] font-bold px-3 py-1 rounded flex items-center"
                        >
                            {isGeneratingChallenge ? <Icons.Loader2 className="w-3 h-3 animate-spin" /> : <Icons.Zap className="w-3 h-3 mr-1" />}
                            Generate Challenge
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-grow flex flex-col relative overflow-hidden">
                        {/* Challenge Overlay */}
                        {activeChallenge && (
                            <div className="bg-slate-800 border-b border-slate-700 p-3 animate-in slide-in-from-top">
                                <h4 className="text-xs font-bold text-white flex items-center justify-between">
                                    {activeChallenge.title}
                                    <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">{activeChallenge.difficulty}</span>
                                </h4>
                                <p className="text-[10px] text-slate-400 mt-1">{activeChallenge.description}</p>
                                
                                <div className="mt-2">
                                    <button 
                                        onClick={() => setShowSolution(!showSolution)}
                                        className="text-[10px] text-cyan-400 hover:underline flex items-center"
                                    >
                                        {showSolution ? <Icons.CheckCircle className="w-3 h-3 mr-1" /> : <Icons.Lock className="w-3 h-3 mr-1" />}
                                        {showSolution ? "Hide Solution Key" : "Reveal Solution Key"}
                                    </button>
                                    
                                    {showSolution && (
                                        <div className="mt-2 bg-black/50 p-2 rounded border border-slate-600">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Expected Solution ({activeChallenge.expectedTimeComplexity})</p>
                                            <pre className="text-[9px] text-green-400 font-mono whitespace-pre-wrap">{activeChallenge.solutionCode}</pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <textarea
                            value={codeBuffer}
                            onChange={(e) => setCodeBuffer(e.target.value)}
                            className="flex-grow bg-slate-950 text-green-400 font-mono text-xs p-4 outline-none resize-none"
                            placeholder="// 1. Click 'Generate Challenge' to get a problem based on JD.
// 2. Ask candidate to solve it.
// 3. Paste their code here & click 'Finish Answer' to analyze."
                        />
                    </div>
                 </div>
             )}
          </div>

          {/* 2. Real-Time Analysis Feed */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex-grow">
             <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
                    <Icons.Activity className="w-4 h-4 mr-2" /> Live Intelligence
                </p>
                {processingState === 'ANALYZING_BACKGROUND' ? (
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-yellow-100 text-yellow-700 border border-yellow-200 flex items-center">
                        <Icons.Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analyzing...
                    </span>
                ) : lastAnalysis && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${lastAnalysis.integrity.status === 'Clean' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200 animate-pulse'}`}>
                        Integrity: {lastAnalysis.integrity.status.toUpperCase()}
                    </span>
                )}
             </div>

             {history.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                     <Icons.Brain className="w-8 h-8 mb-2 opacity-50" />
                     <p className="text-sm">Waiting for first response...</p>
                 </div>
             ) : (
                 <div className="space-y-4">
                     {/* Last Answer Metrics */}
                     <div>
                         <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Previous Answer Quality</p>
                         <div className="flex items-center justify-between">
                             <div className="flex items-center space-x-2">
                                 <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-4 transition-all duration-500 ${
                                     processingState === 'ANALYZING_BACKGROUND' && history[history.length-1].analysis.technicalAccuracy === 0
                                     ? 'border-slate-200 text-slate-300' 
                                     : lastAnalysis?.technicalAccuracy! > 75 ? 'border-green-500 text-green-600' : 
                                       lastAnalysis?.technicalAccuracy! > 50 ? 'border-yellow-500 text-yellow-600' : 'border-red-500 text-red-600'
                                 }`}>
                                     {processingState === 'ANALYZING_BACKGROUND' && history[history.length-1].analysis.technicalAccuracy === 0 
                                      ? '...' 
                                      : `${lastAnalysis?.technicalAccuracy}%`
                                     }
                                 </div>
                                 <div>
                                     <p className="text-sm font-bold text-slate-900 dark:text-white">Technical Score</p>
                                     <p className="text-xs text-slate-500">{lastAnalysis?.answerQuality} Level</p>
                                 </div>
                             </div>
                         </div>
                     </div>

                     {/* Code Forensics Alert */}
                     {lastAnalysis?.codeAnalysis && (
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] text-cyan-400 font-mono uppercase">Code Analysis</span>
                                <span className="text-[10px] text-white font-bold bg-slate-700 px-2 rounded">{lastAnalysis.codeAnalysis.score}/100</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 font-mono">
                                <div>Time: <span className="text-yellow-400">{lastAnalysis.codeAnalysis.timeComplexity}</span></div>
                                <div>Space: <span className="text-purple-400">{lastAnalysis.codeAnalysis.spaceComplexity}</span></div>
                            </div>
                            {lastAnalysis.codeAnalysis.bugs.length > 0 && (
                                <div className="mt-2 text-[10px] text-red-400">
                                    ⚠ {lastAnalysis.codeAnalysis.bugs[0]}
                                </div>
                            )}
                        </div>
                     )}

                     {/* Cheating Alert */}
                     {lastAnalysis?.integrity.status === 'Suspicious' && (
                         <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3 rounded-r-md animate-in slide-in-from-right">
                             <p className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center">
                                 <Icons.AlertCircle className="w-3 h-3 mr-1" /> SUSPICIOUS
                             </p>
                             <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                                 {lastAnalysis.integrity.flaggedReason}
                             </p>
                         </div>
                     )}
                 </div>
             )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default InterviewStage;
