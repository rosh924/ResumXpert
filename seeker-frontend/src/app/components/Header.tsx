import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { useDashboard } from '../context/DashboardContext';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { actions } = useDashboard();

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
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Seeker Edition</p>
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
            variant="default" 
            size="sm"
            onClick={() => window.open('https://github.com', '_blank')}
          >
            Support
          </Button>
        </nav>

        {/* Dynamic Dashboard Actions */}
        {actions && (
          <div className="flex items-center gap-3 border-l border-gray-200 pl-6 ml-6">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
