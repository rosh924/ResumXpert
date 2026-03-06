import { Routes, Route, useNavigate } from 'react-router-dom';
import RecruiterHome from './app/components/RecruiterHome';
import RecruiterDashboard from './app/components/RecruiterDashboard';
import './App.css';

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
    <Routes>
      <Route path="/" element={<RecruiterHome onStart={handleStartAnalysis} />} />
      <Route path="/dashboard" element={<RecruiterDashboard />} />
    </Routes>
  );
}

export default App;
