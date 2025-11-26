import React, { useEffect, useState } from 'react';
import { AppStage, InterviewContextData, InterviewTurn, ReportData } from '../types';
import { generateFinalReport } from '../services/geminiService';
import { generatePDF } from '../services/pdfService';
import { generateZIP } from '../services/zipService';
import { Icons } from '../constants';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { auth } from '../services/firebase';
import { signOut } from "firebase/auth";

interface ReportStageProps {
  history: InterviewTurn[];
  context: InterviewContextData;
  setStage: (stage: AppStage) => void;
  darkMode: boolean;
  toggleTheme: () => void;
}

const ReportStage: React.FC<ReportStageProps> = ({ history, context, setStage, darkMode, toggleTheme }) => {
  const [report, setReport] = useState<ReportData | null>(null);
  const [exportStatus, setExportStatus] = useState<'IDLE' | 'SUCCESS'>('IDLE');
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    try {
      setError(null);
      const data = await generateFinalReport(history, context);
      setReport(data);
    } catch (e: any) {
      console.error("Failed to generate report", e);
      setError(e.message || "Failed to generate final report. Please try again.");
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleATSExport = (isEmergency: boolean = false) => {
      // REAL EXPORT: Generate a JSON blob of the full candidate profile and download it
      try {
          const exportData = {
              metadata: {
                  candidateName: context.candidateName,
                  jobRole: context.jobDescription?.name || "Unknown Role",
                  timestamp: new Date().toISOString(),
                  exporter: "ProbeLensAI v2.5",
                  status: isEmergency ? "RAW_LOGS_ONLY" : "FULL_REPORT"
              },
              scores: report || { note: "Report generation failed" },
              transcript_log: history.map(h => ({
                  question: h.question,
                  answer: h.transcript,
                  metrics: h.analysis
              }))
          };

          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${context.candidateName.replace(/\s+/g, '_')}_ProbeLens_${isEmergency ? 'RawLog' : 'Export'}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          if (!isEmergency) {
            setExportStatus('SUCCESS');
            setTimeout(() => setExportStatus('IDLE'), 3000);
          }
      } catch (e) {
          console.error("Export failed", e);
          alert("Failed to export data.");
      }
  };

  const handleSignOut = () => {
      signOut(auth).then(() => {
          setStage(AppStage.HOME);
      });
  };

  // ERROR STATE
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center transition-colors p-6 text-center">
        <div className="bg-red-100 dark:bg-red-900/20 p-6 rounded-full mb-6">
             <Icons.AlertCircle className="w-16 h-16 text-red-500 dark:text-red-400" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Analysis Generation Failed</h2>
        <p className="text-slate-600 dark:text-slate-300 max-w-md mb-8">
            {error}
        </p>
        <div className="flex flex-col space-y-3 w-full max-w-xs">
             <button 
                onClick={fetchReport}
                className="w-full px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold transition flex items-center justify-center"
            >
                <Icons.RefreshCw className="w-5 h-5 mr-2" /> Retry Analysis
            </button>
             <button 
                onClick={() => handleATSExport(true)}
                className="w-full px-8 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition flex items-center justify-center"
            >
                <Icons.Download className="w-5 h-5 mr-2" /> Download Raw Logs
            </button>
            <button 
                onClick={() => setStage(AppStage.HOME)}
                className="w-full text-slate-500 hover:underline text-sm"
            >
                Return to Dashboard
            </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center transition-colors">
        <Icons.Loader2 className="w-12 h-12 text-cyan-600 animate-spin mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Aggregating Final Intelligence...</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Computing behavioral stability, cross-referencing resume, and generating scores.</p>
      </div>
    );
  }

  // No Data State - Prevents Fake Empty Reports
  if (report.overallScore === 0 && report.turns.length === 0) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center transition-colors p-6 text-center">
            <div className="bg-red-100 dark:bg-red-900/20 p-6 rounded-full mb-6">
                 <Icons.AlertCircle className="w-16 h-16 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Interview Terminated Without Data</h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-md mb-8">
                {report.summary || "No valid candidate responses were recorded. Analysis could not be performed."}
            </p>
            <div className="flex space-x-4">
                 <button 
                    onClick={() => setStage(AppStage.HOME)}
                    className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:opacity-90 transition"
                >
                    Return to Home
                </button>
                 <button 
                    onClick={handleSignOut}
                    className="px-8 py-3 border border-red-200 text-red-500 rounded-xl font-bold hover:bg-red-50 transition"
                >
                    Sign Out
                </button>
            </div>
        </div>
      );
  }

  const radarData = [
    { subject: 'Technical', A: report.categoryScores.technical, fullMark: 100 },
    { subject: 'Subject Knw.', A: report.categoryScores.subjectKnowledge, fullMark: 100 },
    { subject: 'Behavioral', A: report.categoryScores.behavioral, fullMark: 100 },
    { subject: 'Functional', A: report.categoryScores.functional, fullMark: 100 },
    { subject: 'Non-Functional', A: report.categoryScores.nonFunctional, fullMark: 100 },
    { subject: 'Communication', A: report.categoryScores.communication, fullMark: 100 },
  ];

  const skillDepthData = [
    { name: 'Basic', count: report.skillDepthBreakdown.basic },
    { name: 'Intermediate', count: report.skillDepthBreakdown.intermediate },
    { name: 'Expert', count: report.skillDepthBreakdown.expert },
  ];

  const getRecColor = (rec: string) => {
    switch(rec) {
      case 'STRONG_HIRE': return 'bg-green-600';
      case 'HIRE': return 'bg-emerald-500';
      case 'MAYBE': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
      
      {/* Nav Bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
         <div className="max-w-6xl mx-auto flex justify-between items-center">
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
                 <button onClick={handleSignOut} className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                     Sign Out
                 </button>
            </div>
         </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6 py-10 px-4">
        
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-8 flex flex-col md:flex-row justify-between items-start md:items-center border border-slate-200 dark:border-slate-700">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Candidate Report</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">AI-Driven Deep Analysis • {new Date().toLocaleDateString()}</p>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-3 md:space-y-0 md:space-x-4 mt-4 md:mt-0">
             <div className={`px-6 py-2 rounded-full text-white font-bold shadow-md ${getRecColor(report.recommendation)}`}>
               {report.recommendation.replace('_', ' ')}
             </div>
             <div className="flex space-x-2">
                <button onClick={toggleTheme} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white">
                  {darkMode ? <Icons.Sun className="w-5 h-5"/> : <Icons.Moon className="w-5 h-5"/>}
                </button>
                <button 
                  onClick={() => handleATSExport(false)}
                  className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition"
                >
                    {exportStatus === 'SUCCESS' ? <Icons.CheckCircle className="w-4 h-4 text-green-500" /> : <Icons.Upload className="w-4 h-4" />}
                    <span>{exportStatus === 'SUCCESS' ? 'Exported' : 'Export JSON Data'}</span>
                </button>
                <button 
                  onClick={() => generatePDF(report, context)}
                  className="bg-slate-900 dark:bg-cyan-600 hover:bg-slate-800 dark:hover:bg-cyan-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition"
                >
                  <Icons.Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
                <button 
                  onClick={async () => {
                    const zipBlob = await generateZIP(report, context, history);
                    const url = URL.createObjectURL(zipBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Interview_${context.candidateName.replace(/\s+/g, '_')}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition"
                >
                  <Icons.Download className="w-4 h-4" />
                  <span>Download ZIP</span>
                </button>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Executive Summary */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                <Icons.FileText className="w-5 h-5 mr-2 text-cyan-600" /> Executive Summary
              </h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {report.summary}
              </p>
            </div>

            {/* Psychological Profile */}
            <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl shadow-sm p-6 border border-indigo-100 dark:border-indigo-900/50">
              <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-200 mb-4 flex items-center">
                <Icons.Brain className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" /> Psychological & Behavioral Profile
              </h3>
              <p className="text-indigo-800 dark:text-indigo-300 leading-relaxed italic">
                "{report.psychologicalProfile}"
              </p>
            </div>

            {/* Logs */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Interview Log Analysis</h3>
              <div className="space-y-4">
                {report.turns.map((turn, i) => (
                  <div key={i} className={`border-l-4 pl-4 py-2 hover:border-cyan-500 transition-colors ${
                      turn.analysis.integrity.status === 'Suspicious' ? 'border-red-500 bg-red-50/50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-600'
                  }`}>
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                          Q{i+1}: {turn.question} 
                          <span className="text-[10px] ml-2 font-normal opacity-70">({turn.questionComplexity})</span>
                      </p>
                      <div className="flex space-x-2">
                         {turn.analysis.integrity.status === 'Suspicious' && (
                             <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-bold">
                                 FLAGGED
                             </span>
                         )}
                        <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${turn.analysis.technicalAccuracy > 70 ? 'bg-cyan-100 text-cyan-700' : 'bg-orange-100 text-orange-700'}`}>
                           Acc: {turn.analysis.technicalAccuracy}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 italic">"{turn.transcript.substring(0, 150)}..."</p>
                      {turn.analysis.correctAnswer && (
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                          <p className="text-[10px] font-bold text-green-700 dark:text-green-300 mb-1">CORRECT ANSWER:</p>
                          <p className="text-xs text-green-600 dark:text-green-400">{turn.analysis.correctAnswer.substring(0, 200)}{turn.analysis.correctAnswer.length > 200 ? '...' : ''}</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex gap-2 flex-wrap items-center">
                       <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border 
                           ${turn.analysis.answerQuality === 'Expert' ? 'bg-purple-100 text-purple-700 border-purple-200' : 
                             turn.analysis.answerQuality === 'Intermediate' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                             'bg-slate-100 text-slate-600 border-slate-200'}`}>
                           Quality: {turn.analysis.answerQuality}
                       </span>
                       {turn.analysis.keySkillsDemonstrated.map(s => (
                         <span key={s} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">{s}</span>
                       ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats Column */}
          <div className="space-y-6">
             {/* Overall Score */}
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 flex flex-col items-center border border-slate-200 dark:border-slate-700">
               <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                 <svg className="w-full h-full transform -rotate-90">
                   <circle cx="80" cy="80" r="70" stroke={darkMode ? "#334155" : "#f1f5f9"} strokeWidth="10" fill="transparent" />
                   <circle cx="80" cy="80" r="70" stroke="#0891b2" strokeWidth="10" fill="transparent" 
                     strokeDasharray={440} strokeDashoffset={440 - (440 * report.overallScore / 100)} 
                   />
                 </svg>
                 <span className="absolute text-3xl font-bold text-slate-800 dark:text-white">{report.overallScore}</span>
               </div>
               <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Overall Match Score</p>
             </div>

             {/* Integrity Score */}
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Integrity Score</h3>
                    <span className={`text-xl font-bold ${report.integrityScore < 80 ? 'text-red-500' : 'text-green-500'}`}>{report.integrityScore}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div className={`h-2 rounded-full ${report.integrityScore < 80 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${report.integrityScore}%` }}></div>
                </div>
             </div>

             {/* Skill Depth Chart */}
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-4 text-center">Answer Depth Analysis</h3>
                <div className="h-40 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={skillDepthData}>
                           <XAxis dataKey="name" fontSize={10} stroke={darkMode ? '#94a3b8' : '#64748b'} />
                           <Tooltip cursor={{fill: 'transparent'}} contentStyle={{fontSize: '12px'}} />
                           <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                       </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>

             {/* Radar Chart */}
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-4 text-center">Skill Distribution</h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke={darkMode ? "#475569" : "#cbd5e1"} />
                      <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fill: darkMode ? '#cbd5e1' : '#475569'}} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                      <Radar name="Candidate" dataKey="A" stroke="#0891b2" fill="#06b6d4" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportStage;