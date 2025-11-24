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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-white transition-colors duration-300 flex flex-col overflow-hidden">
      
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto w-full z-10 relative shrink-0">
        <div 
          className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setStage(AppStage.HOME)}
        >
          <div className="bg-cyan-500 p-1.5 rounded-lg shadow-lg shadow-cyan-500/30">
             <Icons.Brain className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">ProbeLensAI</span>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-400">
            {darkMode ? <Icons.Sun className="w-5 h-5" /> : <Icons.Moon className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => openAuth('LOGIN')}
            className="text-sm font-medium px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition hover:border-cyan-500 dark:hover:border-cyan-500"
          >
            Recruiter Login
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-grow max-w-7xl mx-auto px-6 py-4 flex flex-col lg:flex-row items-center gap-12 justify-center">
        
        {/* Left Content */}
        <div className="lg:w-1/2 space-y-8 z-10 flex flex-col justify-center pt-4 lg:pt-0">
          <div className="space-y-6">
            <div className="inline-flex items-center space-x-2 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 px-3 py-1 rounded-full text-xs font-bold border border-cyan-100 dark:border-cyan-800 w-fit">
              <Icons.Zap className="w-3 h-3 text-cyan-500 fill-current" />
              <span>Live Adaptive Intelligence v2.5</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] text-slate-900 dark:text-white tracking-tight">
              Autonomous <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">Technical Interviews</span>
            </h1>
            
            <p className="text-base lg:text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              Eliminate bias and save time. Our intelligent system conducts rigorous, adaptive video interviews, analyzing technical depth, facial prosody, and behavioral cues in real-time.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button 
                onClick={() => openAuth('SIGNUP')}
                className="px-8 py-4 bg-slate-900 dark:bg-cyan-500 hover:bg-slate-800 dark:hover:bg-cyan-600 text-white dark:text-slate-900 font-bold rounded-xl transition-all transform hover:scale-105 shadow-xl shadow-cyan-500/20 flex items-center justify-center space-x-2"
              >
                <span>Launch Recruiter Portal</span>
                <Icons.ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Advanced Features Grid - Single Row with Increased Gap */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 w-full">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Core Capabilities</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Item 1 */}
                <div className="flex flex-col items-start space-y-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
                        <Icons.Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Adaptive Difficulty</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-1.5">Scales basic to expert.</p>
                    </div>
                </div>

                {/* Item 2 */}
                <div className="flex flex-col items-start space-y-3">
                    <div className="bg-red-100 dark:bg-red-900/30 p-2.5 rounded-xl text-red-600 dark:text-red-400">
                        <Icons.Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Anti-Cheating</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-1.5">Gaze & audio monitor.</p>
                    </div>
                </div>

                {/* Item 3 */}
                <div className="flex flex-col items-start space-y-3">
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-2.5 rounded-xl text-purple-600 dark:text-purple-400">
                        <Icons.Target className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Zero Hallucination</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-1.5">Strict Resume & JD context.</p>
                    </div>
                </div>

                {/* Item 4 */}
                <div className="flex flex-col items-start space-y-3">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2.5 rounded-xl text-green-600 dark:text-green-400">
                        <Icons.Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Deep Forensics</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-1.5">Sentiment & prosody.</p>
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* Visual (Right Side) - Reverted to Chat/Card Layout */}
        <div className="lg:w-1/2 w-full relative h-full flex items-center justify-center hidden lg:flex">
          <div className="absolute w-[120%] h-[120%] bg-gradient-to-tr from-cyan-400/20 via-blue-500/20 to-purple-500/20 blur-3xl rounded-full opacity-50"></div>
          
          {/* Main Card */}
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-8 duration-700">
             
             {/* Header */}
             <div className="h-14 border-b border-slate-100 dark:border-slate-800 flex items-center px-6 justify-between bg-white dark:bg-slate-900">
                <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">AI_AGENT_ACTIVE</span>
             </div>

             {/* Chat Content */}
             <div className="p-8 space-y-6 bg-slate-50/50 dark:bg-black/20">
                
                {/* AI Question */}
                <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/50 flex-shrink-0 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                        <Icons.Cpu className="w-6 h-6" />
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none text-sm text-slate-700 dark:text-slate-300 shadow-sm leading-relaxed max-w-[90%]">
                        Based on your resume, explain the lifecycle of a React component using Hooks.
                    </div>
                </div>

                {/* Candidate Answer */}
                <div className="flex items-start justify-end space-x-4">
                    <div className="space-y-3 max-w-[90%]">
                        <div className="bg-cyan-50/80 dark:bg-cyan-900/10 border border-cyan-100 dark:border-cyan-900/30 p-4 rounded-2xl rounded-tr-none text-sm text-slate-700 dark:text-slate-300 shadow-sm leading-relaxed">
                            Sure. Functional components use useEffect to handle side effects. It runs after render and can mimic componentDidMount, componentDidUpdate, and componentWillUnmount based on the dependency array.
                        </div>
                        <div className="flex justify-end space-x-2">
                             <span className="text-[10px] font-bold px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md">
                                Technical: 92%
                             </span>
                             <span className="text-[10px] font-bold px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md">
                                Confident
                             </span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center">
                        <Icons.User className="w-6 h-6 text-slate-500 dark:text-slate-400" />
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