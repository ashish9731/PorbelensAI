import React, { useState, useEffect } from 'react';
import { AppStage, InterviewContextData, InterviewTurn } from '../types';
import Home from './Home';
import SetupStage from './SetupStage';
import InterviewStage from './InterviewStage';
import ReportStage from './ReportStage';

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

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

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