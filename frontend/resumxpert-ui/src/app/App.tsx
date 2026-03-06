import { useEffect, useState } from "react";
import ModeSelection from "./components/ModeSelection";
import SeekerDashboard from "./components/SeekerDashboard";
import RecruiterDashboard from "./components/RecruiterDashboard";

export default function App() {
  const [payload, setPayload] = useState<any>(null);

  useEffect(() => {
    if (window.location.search) {
      setPayload(
        JSON.parse(decodeURIComponent(window.location.search.substring(1)))
      );
    }
  }, []);

  if (!payload) return <ModeSelection onSelect={setPayload} />;

  if (payload.mode === "seeker")
    return <SeekerDashboard {...payload} />;

  return <RecruiterDashboard {...payload} />;
}
