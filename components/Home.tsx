import React, { useState } from 'react';
import { Icons } from '../constants';
import { AppStage } from '../types';

interface HomeProps {
  setStage: (stage: AppStage) => void;
  darkMode: boolean;
  toggleTheme: () => void;
}

type AuthMode = 'LOGIN' | 'SIGNUP';

const Home: React.FC<HomeProps> = ({ setStage, darkMode, toggleTheme }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('LOGIN');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API delay
    setTimeout(() => {
      setIsLoading(false);

      if (authMode === 'LOGIN') {
        // Mock Login Logic
        if (email && password.length >= 6) {
           // Success
           setStage(AppStage.SETUP);
        } else {
           setError('Invalid email or password. (Try password length > 5)');
        }
      } else {
        // Mock Signup Logic
        if (email && password.length >= 6 && fullName && companyName) {
            // Success
            setStage(AppStage.SETUP);
        } else {
            setError('Please fill in all fields correctly.');
        }
      }
    }, 1500);
  };

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setShowAuthModal(true);
    setError('');
    // Reset fields
    setEmail('');
    setPassword('');
    setFullName('');
    setCompanyName('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto w-full z-10 relative">
        <div 
          className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setStage(AppStage.HOME)}
        >
          <div className="bg-cyan-500 p-1.5 rounded-lg">
             <Icons.Brain className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">ProbeLensAI</span>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition">
            {darkMode ? <Icons.Sun className="w-5 h-5" /> : <Icons.Moon className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => openAuth('LOGIN')}
            className="text-sm font-medium px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition"
          >
            Recruiter Login
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-6 py-12 lg:py-24 flex flex-col lg:flex-row items-center gap-12">
        <div className="lg:w-1/2 space-y-8 z-10">
          <div className="inline-flex items-center space-x-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 px-4 py-1.5 rounded-full text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            <span>Next-Gen AI Engine</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold leading-tight text-slate-900 dark:text-white">
            Autonomous <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">Technical Interviews</span>
          </h1>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
            Eliminate bias and save time. Our intelligent system conducts rigorous, adaptive video interviews, analyzing technical depth, facial prosody, and behavioral cues in real-time.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => openAuth('SIGNUP')}
              className="px-8 py-4 bg-slate-900 dark:bg-cyan-500 hover:bg-slate-800 dark:hover:bg-cyan-600 text-white dark:text-slate-900 font-bold rounded-xl transition-all transform hover:scale-105 shadow-xl flex items-center justify-center space-x-2"
            >
              <span>Launch Recruiter Portal</span>
              <Icons.ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
            <div className="flex items-center"><Icons.CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Anti-Cheating</div>
            <div className="flex items-center"><Icons.CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Deep Analysis</div>
            <div className="flex items-center"><Icons.CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Instant PDF</div>
          </div>
        </div>

        {/* Visual */}
        <div className="lg:w-1/2 w-full relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-r from-cyan-400/20 to-blue-500/20 blur-3xl rounded-full"></div>
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-2xl overflow-hidden">
             {/* Fake UI mockup */}
             <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="text-xs font-mono text-slate-400">AI_AGENT_ACTIVE</div>
             </div>
             
             <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                      <Icons.Cpu className="text-blue-600 dark:text-blue-400 w-4 h-4"/>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-r-xl rounded-bl-xl text-sm text-slate-700 dark:text-slate-300 shadow-sm">
                    <p>Based on your resume, explain the lifecycle of a React component using Hooks.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 justify-end">
                  <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800 p-3 rounded-l-xl rounded-br-xl text-sm shadow-sm">
                     <p className="text-slate-700 dark:text-slate-300">Sure. Functional components use useEffect to handle side effects...</p>
                     <div className="mt-2 flex items-center space-x-2">
                         <span className="text-[10px] bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">Technical: 92%</span>
                         <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">Confident</span>
                     </div>
                  </div>
                   <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Icons.User className="text-slate-500 dark:text-slate-400 w-4 h-4"/>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                {authMode === 'LOGIN' ? 'Recruiter Login' : 'Create Account'}
              </h2>
              <button onClick={() => setShowAuthModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-4">
              
              {authMode === 'SIGNUP' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
                    <input 
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none transition text-slate-900 dark:text-white"
                      placeholder="John Doe"
                    />
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Company Name</label>
                    <input 
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none transition text-slate-900 dark:text-white"
                      placeholder="Tech Corp Inc."
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Email Address</label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none transition text-slate-900 dark:text-white"
                  placeholder="name@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Password</label>
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none transition text-slate-900 dark:text-white"
                  placeholder="••••••••"
                />
              </div>

              {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-900">{error}</p>}
              
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-lg transition flex items-center justify-center"
              >
                {isLoading ? (
                  <Icons.Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  authMode === 'LOGIN' ? 'Sign In' : 'Get Started'
                )}
              </button>

              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => openAuth(authMode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')}
                  className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                  {authMode === 'LOGIN' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;