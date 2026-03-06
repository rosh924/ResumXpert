import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { useRef } from "react";
import {
  Download,
  MapPin,
  ArrowLeft,
  Clock,
  ExternalLink,
  Briefcase,
  User,
  CheckCircle2,
  AlertCircle,
  Target,
  BookOpen,
  LayoutDashboard,
  Github,
  Sparkles,
  TrendingUp,
  Award
} from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

// Helper for Circular Progress with Gradient
const CircularProgress = ({ value, size = 120, strokeWidth = 10 }: { value: number; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background circle */}
      <svg width={size} height={size} className="transform -rotate-90 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated value circle */}
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFCE99" />
            <stop offset="100%" stopColor="#FF9644" />
          </linearGradient>
        </defs>
      </svg>
      {/* Text in center */}
      <div className="absolute flex flex-col items-center">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="text-4xl font-extrabold text-foreground tracking-tight drop-shadow-md"
        >
          {Math.round(value)}%
        </motion.span>
        <span className="text-xs text-primary font-medium tracking-wide uppercase mt-1">Match Rate</span>
      </div>
    </div>
  );
};

export default function SeekerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const jobRole = (location.state as any)?.jobRole || "";
  const jobDescription = (location.state as any)?.jobDescription || "";
  const resumeFile = (location.state as any)?.resumeFile; // File object
  const extensionData = (location.state as any)?.extensionData; // JSON from extension

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        let response;

        if (resumeFile) {
          // Case 1: PDF Upload -> Send FormData
          const formData = new FormData();
          formData.append("resume", resumeFile);
          formData.append("job_role", jobRole);
          formData.append("job_description", jobDescription);

          response = await fetch("http://127.0.0.1:5000/analyze-seeker", {
            method: "POST",
            body: formData, // No Content-Type header, let browser set boundary
          });

        } else if (extensionData) {
          // Case 2: Extension Data -> Send JSON
          response = await fetch("http://127.0.0.1:5000/analyze-seeker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "extension",
              job_role: jobRole,
              job_description: jobDescription,
              extension_data: extensionData
            }),
          });
        } else {
          // Case 3: Fallback / Error (Should be blocked by ModeSelection)
          throw new Error("No resume or profile data provided.");
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        setResult(data);
      } catch (err: any) {
        console.error("Error fetching analysis:", err);
        setError(err.message || "Failed to fetch analysis");
      } finally {
        setLoading(false);
      }
    }

    if (jobRole) {
      fetchAnalysis();
    } else {
      setLoading(false);
      setError("Missing job role. Please start over.");
    }
  }, [location.state]);

  const reportRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null); // New ref for the hidden printable version

  const handleDownloadReport = async () => {
    if (!printRef.current) return;

    try {
      // Temporarily reveal the print container just for the screenshot
      printRef.current.style.display = 'block';

      // Hide images to avoid canvas poisoning as before
      const images = Array.from(printRef.current.querySelectorAll('img'));
      const originalDisplays = images.map(img => img.style.display);
      images.forEach(img => {
        img.style.display = 'none';
      });

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: "#ffffff", // Pure white for PDF
        useCORS: true,
        logging: false,
        allowTaint: false,
        windowWidth: 794, // Standard A4 pixel width at 96 DPI
      });

      // Restore images
      images.forEach((img, i) => {
        img.style.display = originalDisplays[i];
      });

      // Hide the print container again
      printRef.current.style.display = 'none';

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`ResumXpert_Report_${result?.candidate?.name?.replace(/\s+/g, "_") || "Candidate"}.pdf`);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      // Ensure we re-hide it if it crashes
      if (printRef.current) printRef.current.style.display = 'none';
      alert(`Failed to generate PDF report. Error: ${err.message || err}\n\nStack: ${err.stack || ''}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background text-foreground relative overflow-hidden">
        {/* Background glow for loading state */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-24 h-24 border-4 border-primary/30 border-t-primary rounded-full shadow-[0_0_20px_rgba(255,150,68,0.3)]"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-3 z-10">
          <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-400">Analyzing Profile</h2>
          <p className="text-foreground opacity-70">Crafting your roadmap to become a <span className="font-semibold">{jobRole}</span></p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background px-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel text-center space-y-4 p-8 rounded-3xl max-w-lg border border-red-500/20">
          <div className="bg-red-500/20 p-4 rounded-full inline-block mb-2">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl text-foreground font-bold">Analysis Failed</h2>
          <p className="text-foreground opacity-70">{error}</p>
          <Button onClick={() => navigate(-1)} variant="default" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 border-0">
            Return Home
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!result) return null;

  // Render the hidden printable version first, so it is in the DOM
  const PrintableReport = () => (
    <div
      ref={printRef}
      style={{ display: 'none', background: 'white', color: 'black', width: '794px', padding: '40px', fontFamily: 'sans-serif' }}
    >
      <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: '20px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#0f172a' }}>{result?.candidate?.name || "Candidate Report"}</h1>
        <p style={{ fontSize: '16px', color: '#475569', margin: '0 0 10px 0' }}>{result?.candidate?.headline || "Career Professional"}</p>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Target Role: <strong>{jobRole}</strong></p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <div style={{ width: '48%', background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '18px', margin: '0 0 15px 0', color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '10px' }}>ATS Match Score</h2>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: result.ats_score > 70 ? '#16a34a' : result.ats_score > 40 ? '#ca8a04' : '#dc2626' }}>
            {result.ats_score}%
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>Match rate against standard {jobRole} requirements.</p>
        </div>

        <div style={{ width: '48%', background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '18px', margin: '0 0 15px 0', color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '10px' }}>Skills to Acquire</h2>
          {result.missing_skills?.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#dc2626', fontSize: '14px' }}>
              {result.missing_skills.map((skill: string, i: number) => (
                <li key={i} style={{ marginBottom: '5px' }}>{skill}</li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#16a34a', fontSize: '14px' }}>Profile is highly optimized for this role.</p>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', margin: '0 0 15px 0', color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '5px' }}>Recommended Roadmap</h2>
        {result.roadmap?.map((step: any, i: number) => (
          <div key={i} style={{ marginBottom: '15px' }}>
            <h3 style={{ fontSize: '16px', margin: '0 0 5px 0', color: '#334155' }}>Step {i + 1}: {step.step || `Category ${i + 1}`}</h3>
            <p style={{ fontSize: '14px', margin: 0, color: '#475569' }}>{step.topic}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '40px', borderTop: '1px solid #e2e8f0', paddingTop: '20px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
        Generated by ResumXpert - AI Career Coach
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-foreground font-sans selection:bg-primary/30 pb-20">
      <PrintableReport />

      {/* Decorative background elements using CSS only */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-orange-400/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <div ref={reportRef} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Navbar / Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-4 rounded-2xl sticky top-4 z-50">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-foreground/10 text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-400">ResumXpert</span>
                <span className="text-foreground opacity-50 font-light text-sm">|</span>
                <span className="text-foreground opacity-70 font-medium text-sm tracking-wide">AI Career Coach</span>
              </h1>
            </div>
          </div>
          <Button onClick={handleDownloadReport} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(255,150,68,0.3)] border-0 transition-all hover:scale-105">
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </header>

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-6"
          >
            <div className="glass-panel rounded-3xl p-8 relative overflow-hidden group hover:shadow-[0_0_30px_rgba(255,150,68,0.15)] transition-shadow duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-orange-300 to-primary p-[2px] mb-6 shadow-lg shadow-orange-500/20">
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center border-4 border-background overflow-hidden">
                    {result?.candidate?.picture ? (
                      <img src={result.candidate.picture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-primary/70" />
                    )}
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">{result?.candidate?.name || "Candidate Name"}</h2>
                <p className="text-foreground opacity-70 text-sm mb-6 line-clamp-2 px-2 leading-relaxed">{result?.candidate?.headline || "Career Professional"}</p>

                <div className="flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 px-4 py-2 rounded-full border border-primary/20 mb-6">
                  <MapPin className="w-3.5 h-3.5" />
                  {result?.candidate?.location || "Location N/A"}
                </div>

                {/* Extracted Skills Section */}
                {result?.candidate?.skills && result.candidate.skills.length > 0 && (
                  <div className="w-full pt-6 border-t border-primary/20">
                    <p className="text-xs font-bold text-foreground opacity-60 uppercase tracking-wider mb-4 text-left">Extracted Skills</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {result.candidate.skills.slice(0, 10).map((skill: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="bg-primary/5 border-primary/10 text-foreground opacity-80 text-[10px] px-2 py-1 font-medium hover:bg-primary/10 transition-colors">
                          {skill}
                        </Badge>
                      ))}
                      {result.candidate.skills.length > 10 && (
                        <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-[10px] px-2 py-1 font-medium">
                          +{result.candidate.skills.length - 10} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary to-orange-600 rounded-3xl p-8 shadow-2xl text-primary-foreground relative overflow-hidden group">
              <div className="absolute top-[-20px] right-[-20px] p-4 opacity-10 transform group-hover:scale-110 transition-transform duration-700">
                <Briefcase className="w-40 h-40" />
              </div>
              <p className="text-primary-foreground/80 text-xs font-bold uppercase tracking-widest mb-3">Target Role</p>
              <h3 className="text-3xl font-bold mb-2 leading-tight">{jobRole}</h3>
              <div className="mt-6 flex items-center gap-2 text-xs font-medium bg-black/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10 text-primary-foreground">
                <Target className="w-3.5 h-3.5 text-primary-foreground/80" /> Analysis Complete
              </div>
            </div>
          </motion.div>

          {/* Right: ATS & Insights */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* ATS Score Card */}
            <div className="glass-panel rounded-3xl p-8 flex flex-col items-center justify-center relative hover:bg-background/20 transition-colors group">
              <div className="absolute top-6 left-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-bold text-foreground opacity-80 tracking-wide">ATS Score</span>
              </div>
              <div className="group-hover:scale-105 transition-transform duration-500">
                <CircularProgress value={result?.ats_score || 0} size={200} strokeWidth={18} />
              </div>
              <p className="mt-8 text-center text-foreground opacity-70 text-sm px-6 leading-relaxed">
                Your profile aligns with <strong className="text-foreground text-base">{Math.round(result?.ats_score || 0)}%</strong> of the key requirements extracted from the job description.
              </p>
            </div>

            {/* Skills Gap */}
            <div className="glass-panel rounded-3xl p-6 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6 border-b border-primary/20 pb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Skills to Acquire</h3>
                </div>
                <Badge variant="outline" className="text-orange-400 border-orange-500/20 bg-orange-500/5 text-xs">
                  {result.missing_skills?.length || 0} Identified
                </Badge>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex flex-wrap gap-2 content-start">
                  {result.missing_skills?.length > 0 ? (
                    result.missing_skills.map((skill: string, i: number) => (
                      <motion.div
                        key={skill}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 + (i * 0.05) }}
                      >
                        <Badge className="bg-gradient-to-r from-orange-500/10 to-red-500/10 text-orange-200 border-orange-500/20 hover:bg-orange-500/20 px-3 py-1.5 text-sm transition-all hover:scale-105 cursor-default">
                          + {skill}
                        </Badge>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-primary flex flex-col items-center justify-center text-center gap-3 bg-primary/5 p-8 rounded-2xl border border-primary/10 w-full h-full">
                      <div className="p-3 bg-primary/10 rounded-full text-primary">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="font-bold text-lg text-foreground">Perfect Match!</p>
                        <p className="text-sm text-foreground opacity-70">You have all the core skills for this role.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Roadmap Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3 mb-2 px-2">
            <div className="bg-primary/20 p-2.5 rounded-xl border border-primary/20 shadow-[0_0_15px_rgba(255,150,68,0.2)]">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Personalized Learning Roadmap</h2>
          </div>

          <div className="glass-panel rounded-3xl p-8 relative overflow-hidden">
            {/* Dynamic background glow */}
            <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-primary/5 blur-[100px] pointer-events-none"></div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
              {/* Connecting Line (Desktop) */}
              <div className="hidden md:block absolute top-[60px] left-0 w-full h-[2px] bg-gradient-to-r from-primary/30 via-orange-400/30 to-primary/30 -z-10"></div>

              {result.roadmap && result.roadmap.length > 0 ? (
                result.roadmap.map((step: any, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    className="group"
                  >
                    <div className="bg-background/80 backdrop-blur-sm border border-primary/20 p-6 rounded-2xl hover:border-primary/40 transition-all duration-300 h-full flex flex-col hover:bg-background hover:shadow-[0_0_20px_rgba(255,150,68,0.15)] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>

                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-background to-orange-100 border border-primary/20 flex items-center justify-center text-foreground font-bold text-xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300 group-hover:border-primary/50">
                        <span className="bg-clip-text text-transparent bg-gradient-to-br from-foreground to-primary">{i + 1}</span>
                      </div>

                      <h4 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{step.skill}</h4>

                      <span className="text-xs font-mono text-primary mb-4 flex items-center gap-1.5 bg-primary/10 w-fit px-2.5 py-1 rounded-md border border-primary/20">
                        <Clock className="w-3 h-3" /> {step.duration}
                      </span>

                      <p className="text-sm text-foreground opacity-70 leading-relaxed group-hover:opacity-100 transition-colors">{step.topic}</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-4 text-center text-foreground opacity-60 py-10">
                  <p>No roadmap generated. Please check your network connection or try a different job role.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Resources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Courses */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="bg-orange-500/20 p-2.5 rounded-xl border border-orange-500/20">
                <LayoutDashboard className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Recommended Courses</h2>
            </div>

            <div className="space-y-4">
              {result.courses?.map((course: any, i: number) => (
                <a
                  key={i}
                  href={course.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="glass-card rounded-2xl p-5 flex items-start justify-between gap-5 group-hover:border-primary/50 group-hover:shadow-[0_0_15px_rgba(255,150,68,0.15)]">
                    <div>
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 text-lg">{course.title}</h4>
                      <div className="flex items-center gap-3 mt-3">
                        <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-[11px] px-2.5 py-0.5">
                          {course.platform}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-yellow-500 font-medium">
                          <span>★</span> {course.rating}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-5 h-5 text-foreground opacity-50 group-hover:text-primary transition-colors mt-1" />
                  </div>
                </a>
              ))}
            </div>
          </motion.div>

          {/* Projects */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="bg-background/80 p-2.5 rounded-xl border border-primary/20">
                <Github className="w-6 h-6 text-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Open Source Projects</h2>
            </div>

            <div className="space-y-4">
              {result.projects?.map((proj: any, i: number) => (
                <a
                  key={i}
                  href={proj.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="glass-card rounded-2xl p-5 group-hover:border-primary/50 group-hover:shadow-[0_0_15px_rgba(255,150,68,0.15)]">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-foreground group-hover:text-primary transition-colors text-lg">{proj.name}</h4>
                      <Badge className="bg-background text-foreground border border-primary/20 text-xs px-2.5 py-0.5">★ {proj.stars}</Badge>
                    </div>
                    <p className="text-sm text-foreground opacity-70 line-clamp-2 leading-relaxed">{proj.description || "No description provided."}</p>
                    <div className="mt-3 text-xs text-primary/80 flex items-center gap-1 group-hover:text-primary group-hover:underline decoration-primary/30 underline-offset-4">
                      View Repository <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
