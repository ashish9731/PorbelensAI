import React, { useState, useEffect } from 'react';
import { AppStage, InterviewContextData, InterviewTurn } from '../types';
import Home from './Home';
import SetupStage from './SetupStage';
import InterviewStage from './InterviewStage';
import ReportStage from './ReportStage';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const InterviewApp: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.HOME);
  const [context, setContext] = useState<InterviewContextData>({
    jobDescription: null,
    resume: null,
    knowledgeBase: null,
    candidateName: ''
  });
  const [history, setHistory] = useState<InterviewTurn[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Theme Init
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Auth Persistence Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, skip Home if currently at Home
        if (stage === AppStage.HOME) {
            setStage(AppStage.SETUP);
        }
      } 
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, [stage]);

  const toggleTheme = () => setDarkMode(!darkMode);

  if (isAuthChecking) {
      return <div className="min-h-screen bg-slate-50 dark:bg-slate-950"></div>; // Clean loading state
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      {stage === AppStage.HOME && <Home setStage={setStage} darkMode={darkMode} toggleTheme={toggleTheme} />}
      {stage === AppStage.SETUP && <SetupStage setContext={setContext} setStage={setStage} darkMode={darkMode} toggleTheme={toggleTheme} />}
      {stage === AppStage.INTERVIEW && (
        <InterviewStage 
          context={context} 
          setHistory={setHistory} 
          history={history} 
          setStage={setStage} 
          darkMode={darkMode}
          toggleTheme={toggleTheme}
        />
      )}
      {stage === AppStage.REPORT && (
        <ReportStage 
          history={history} 
          context={context} 
          setStage={setStage}
          darkMode={darkMode}
          toggleTheme={toggleTheme}
        />
      )}
    </div>
  );
};

export default InterviewApp;