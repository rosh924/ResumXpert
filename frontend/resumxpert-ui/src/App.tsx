import { Routes, Route, useNavigate } from 'react-router-dom';
import ModeSelection from './app/components/ModeSelection';
import SeekerDashboard from './app/components/SeekerDashboard';
import RecruiterDashboard from './app/components/RecruiterDashboard';
import './App.css';

function App() {
  const navigate = useNavigate();

  const handleModeSelect = (data: any) => {
    if (data.mode === 'seeker') {
      // Map data to expected format for SeekerDashboard
      navigate('/seeker', {
        state: {
          jobRole: data.job_role,
          jobDescription: data.job_description,
          resumeFile: data.resumeFile,
          extensionData: data.extensionData,
          // Fallback for manual Recruiter entry if we ever reuse this component for that, 
          // or if extensionData is missing and we want to allow manual entry later.
          profile: {
            name: data.name || "Candidate",
            headline: data.headline || "Job Seeker",
            location: data.location || "Unknown",
            skills: data.skills || []
          }
        }
      });
    } else if (data.mode === 'recruiter') {
      navigate('/recruiter', {
        state: {
          jobRole: data.job_role,
          jobDescription: data.job_description,
          candidates: data.candidates || []
        }
      });
    }
  };

  return (
    <Routes>
      <Route path="/" element={<ModeSelection onSelect={handleModeSelect} />} />
      <Route path="/seeker" element={<SeekerDashboard />} />
      <Route path="/recruiter" element={<RecruiterDashboard />} />
    </Routes>
  );
}

export default App;
