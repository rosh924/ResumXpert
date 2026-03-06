import { Routes, Route, useNavigate } from 'react-router-dom';
import SeekerHome from './app/components/SeekerHome';
import SeekerDashboard from './app/components/SeekerDashboard';
import './App.css';

function App() {
  const navigate = useNavigate();

  const handleStartAnalysis = (data: any) => {
    navigate('/dashboard', {
      state: {
        jobRole: data.job_role,
        jobDescription: data.job_description,
        resumeFile: data.resumeFile,
        extensionData: data.extensionData,
        profile: {
          name: data.extensionData?.name || "Candidate",
          headline: data.extensionData?.headline || "Job Seeker",
          location: data.extensionData?.location || "Unknown",
          skills: data.extensionData?.skills || []
        }
      }
    });
  };

  return (
    <Routes>
      <Route path="/" element={<SeekerHome onStart={handleStartAnalysis} />} />
      <Route path="/dashboard" element={<SeekerDashboard />} />
    </Routes>
  );
}

export default App;
