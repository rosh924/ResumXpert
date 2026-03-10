import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { useDashboard } from '../context/DashboardContext';
import { useState, useEffect } from 'react';
import { Database, Search, User, ExternalLink, X } from 'lucide-react';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { actions } = useDashboard();
  
  const [showDb, setShowDb] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const fetchCandidates = async () => {
    try {
      const res = await fetch('http://127.0.0.1:5000/candidates');
      const data = await res.json();
      setCandidates(data);
    } catch (e) {
      console.error("DB Fetch Error:", e);
    }
  };

  useEffect(() => {
    if (showDb) fetchCandidates();
  }, [showDb]);

  const filteredCandidates = candidates.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.job_role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 group-hover:scale-105 transition-transform">
             <span className="text-primary font-black text-xl italic drop-shadow-sm">RX</span>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-400 leading-tight">ResumXpert</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Recruiter Pro</p>
          </div>
        </div>

        <nav className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/')}
            className={`text-sm font-medium transition-colors ${location.pathname === '/' ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}
          >
            Home
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            className={`text-sm font-medium transition-colors ${location.pathname === '/dashboard' ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}
          >
            Dashboard
          </button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowDb(!showDb)}
            className={showDb ? 'bg-primary/10 border-primary text-primary' : ''}
          >
            <Database className="w-4 h-4 mr-2" /> Database
          </Button>
          <Button 
            variant="outline" 
            size="sm"
          >
            Admin
          </Button>
        </nav>

        {/* Dynamic Dashboard Actions */}
        {actions && (
          <div className="flex items-center gap-3 border-l border-gray-200 pl-6 ml-6">
            {actions}
          </div>
        )}

        {/* Database Quick View Overlay */}
        {showDb && (
          <div className="absolute top-full mt-2 right-0 w-[450px] bg-white border border-gray-200 shadow-2xl rounded-xl z-[70] overflow-hidden flex flex-col max-h-[600px] animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" /> Candidate Database
              </h3>
              <button onClick={() => setShowDb(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search name or role..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredCandidates.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <User className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No candidates found in database.</p>
                </div>
              ) : (
                filteredCandidates.map((c) => (
                  <div key={c.id} className="p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-all group cursor-default">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        {c.picture ? (
                           <img src={c.picture} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-primary font-bold">{c.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-gray-900 truncate">{c.name}</p>
                          <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">{c.job_role}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{c.headline}</p>
                      </div>
                      {c.linkedin_url && (
                        <a 
                          href={c.linkedin_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 rounded-md text-primary"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-400">{filteredCandidates.length} Candidates Shown</span>
              <Button size="sm" variant="ghost" className="text-xs font-bold text-primary" onClick={() => navigate('/dashboard')}>
                View Rankings
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
