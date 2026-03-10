import { Routes, Route, useNavigate } from 'react-router-dom';
import RecruiterHome from './app/components/RecruiterHome';
import RecruiterDashboard from './app/components/RecruiterDashboard';
import './App.css';

import Header from './app/components/Header';
import Footer from './app/components/Footer';
import { DashboardProvider } from './app/context/DashboardContext';

function App() {
  const navigate = useNavigate();

  const handleStartAnalysis = (data: any) => {
    navigate('/dashboard', {
      state: {
        jobRole: data.job_role,
        jobDescription: data.job_description,
        candidates: data.candidates || []
      }
    });
  };

  return (
    <DashboardProvider>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow pt-20">
          <Routes>
            <Route path="/" element={<RecruiterHome onStart={handleStartAnalysis} />} />
            <Route path="/dashboard" element={<RecruiterDashboard />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </DashboardProvider>
  );
}

export default App;
