import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useRef } from "react";
import {
  Download,
  ArrowLeft,
  TrendingUp,
  Users,
  Award,
  Crown,
  MapPin,
  Search,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useDashboard } from "../context/DashboardContext";

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialJobRole = (location.state as any)?.jobRole || "Frontend Developer";
  const jobDescription = (location.state as any)?.jobDescription || "";
  const candidateProfiles = (location.state as any)?.candidates || [];

  const [jobRole, setJobRole] = useState(initialJobRole);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidateCart, setCandidateCart] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [hasSubmittedCart, setHasSubmittedCart] = useState(false);

  // CRUD State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<any>(null);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    headline: "",
    location: "",
    skills: "",
    linkedin_url: "",
    picture: ""
  });

  // Run once on mount to load the cart and available roles
  useEffect(() => {
    const storedCart = localStorage.getItem("recruiterCart");
    if (storedCart) {
      try {
        setCandidateCart(JSON.parse(storedCart));
      } catch (e) { }
    }

    async function fetchRoles() {
      try {
        const res = await fetch("http://127.0.0.1:5000/get-job-roles");
        const data = await res.json();
        setAvailableRoles(data.roles);
      } catch (e) { }
    }
    fetchRoles();
  }, []);

  const analyzeCandidates = async () => {
    setLoading(true);
    try {
      // Only send the cart payload if this is the first analysis and we are on the initially requested role
      const candidatesToSend = (!hasSubmittedCart && jobRole === initialJobRole) ? candidateProfiles : [];

      const response = await fetch("http://127.0.0.1:5000/analyze-recruiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: candidatesToSend,
          job_role: jobRole,
          job_description: jobDescription, // Send context if this is the first analysis
        }),
      });

      const data = await response.json();
      setCandidates(data.ranked_candidates || []);
      setHasSubmittedCart(true);

      // Clear the candidates from location state so they aren't re-sent on browser refresh
      if (!hasSubmittedCart && jobRole === initialJobRole && candidateProfiles.length > 0) {
        navigate(location.pathname, { 
          replace: true, 
          state: { 
            ...location.state, 
            candidates: [] // Clear candidates after initial submission
          } 
        });
      }
    } catch (err) {
      console.error("Recruiter analysis error:", err);
    } finally {
      setLoading(false);
    }
  };

  const { setActions } = useDashboard();

  // Teleport actions to header
  useEffect(() => {
    setActions(
      <>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden lg:inline">Role:</span>
          <div className="relative group">
            <select
              className="appearance-none bg-primary/5 hover:bg-primary/20 text-primary font-bold text-sm py-1.5 pl-3 pr-8 rounded border border-primary/20 transition-all cursor-pointer"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
            >
              {!availableRoles.includes(jobRole) && <option value={jobRole}>{jobRole}</option>}
              {availableRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-primary absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none transition-transform" />
          </div>
        </div>
        
        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          variant="outline"
          size="sm"
          className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 font-bold"
        >
          <Plus className="w-4 h-4 mr-2" /> Add
        </Button>
        <Button
          onClick={handleDownloadReport}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-white font-bold"
        >
          <Download className="w-4 h-4 mr-2" /> Export
        </Button>
      </>
    );
    return () => setActions(null);
  }, [jobRole, availableRoles, candidates, setActions]); // Added candidates to fix stale closure

  // Run whenever jobRole changes
  useEffect(() => {
    analyzeCandidates();
  }, [jobRole]);

  const handleAddCandidate = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newCandidate,
          skills: newCandidate.skills.split(",").map(s => s.trim()).filter(Boolean),
          job_role: jobRole
        }),
      });
      if (response.ok) {
        setIsAddModalOpen(false);
        setNewCandidate({ name: "", headline: "", location: "", skills: "", linkedin_url: "", picture: "" });
        // Refresh directly
        analyzeCandidates();
      }
    } catch (err) {
      console.error("Failed to add candidate:", err);
    }
  };

  const handleUpdateCandidate = async () => {
    if (!editingCandidate) return;
    try {
      const response = await fetch(`http://127.0.0.1:5000/candidates/${editingCandidate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingCandidate,
          skills: typeof editingCandidate.skills === 'string' 
            ? editingCandidate.skills.split(",").map((s: string) => s.trim()).filter(Boolean) 
            : editingCandidate.skills
        }),
      });
      if (response.ok) {
        setIsEditModalOpen(false);
        setEditingCandidate(null);
        // Refresh directly
        analyzeCandidates();
      }
    } catch (err) {
      console.error("Failed to update candidate:", err);
    }
  };

  const handleDeleteCandidate = async (id: number) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this candidate?")) return;
    try {
      const response = await fetch(`http://127.0.0.1:5000/candidates/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        // Refresh directly
        analyzeCandidates();
      }
    } catch (err) {
      console.error("Failed to delete candidate:", err);
    }
  };

  const topCandidates = candidates.slice(0, 5);
  const averageScore =
    candidates.length > 0
      ? Math.round(
        candidates.reduce((sum, c) => sum + c.ats_score, 0) /
        candidates.length
      )
      : 0;

  const reportRef = useRef<HTMLDivElement>(null);

  const loadImageData = async (url: string): Promise<string> => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/proxy-image?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      if (data.data_url) {
        return data.data_url;
      }
      throw new Error(data.error || "Failed to load image");
    } catch (err) {
      console.warn("Proxy image failed:", err);
      throw err;
    }
  };

  const handleDownloadReport = async () => {
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let currentY = margin;

      const addFooter = (doc: jsPDF, pageNum: number) => {
        const str = `Page ${pageNum}`;
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text("ResumXpert \xA9 " + new Date().getFullYear(), margin, pageHeight - 10);
        doc.text(str, pageWidth - margin - doc.getTextWidth(str), pageHeight - 10);
      };

      const checkPageBreak = (neededHeight: number) => {
        if (currentY + neededHeight > pageHeight - margin - 15) {
          pdf.addPage();
          currentY = margin + 10; // Extra padding at top of new page
        }
      };

      // Header
      pdf.setFontSize(26);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 64, 175); // Dark Blue (RGB)
      pdf.text("ResumXpert Recruiter Report", margin, currentY + 5);
      currentY += 15;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139); // Slate 500
      pdf.text(`Target Role: ${jobRole.replace(/[^\x20-\x7E]/g, '')}`, margin, currentY);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 50, currentY);
      currentY += 10;

      pdf.setDrawColor(30, 64, 175); // Dark Blue line
      pdf.setLineWidth(0.8);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 12;

      // Detailed Candidates Analysis
      for (let i = 0; i < topCandidates.length; i++) {
        const candidate = topCandidates[i];
        const isFit = candidate.ats_score >= 70;

        checkPageBreak(30);
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0);
        pdf.text(`Rank #${i + 1}: Candidate Analysis`, margin, currentY);
        currentY += 10;

        const picSize = 25;
        let textStartX = margin;
        let afterPicY = currentY;

        if (candidate.picture) {
          try {
            const imgData = await loadImageData(candidate.picture);
            pdf.addImage(imgData, 'PNG', margin, currentY, picSize, picSize);
            pdf.setDrawColor(226, 232, 240); // Slate border
            pdf.rect(margin, currentY, picSize, picSize); // border
            textStartX = margin + picSize + 10;
            afterPicY = currentY + picSize + 5;
          } catch (e) {
            console.warn("Could not load candidate picture for PDF.");
          }
        }

        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text((candidate.name || "Candidate").replace(/[^\x20-\x7E]/g, ''), textStartX, currentY + 5);

        pdf.setFontSize(11);
        pdf.setFont("helvetica", "italic");
        pdf.setTextColor(100);
        const cleanHeadline = (candidate.headline || "Professional").replace(/[^\x20-\x7E]/g, '');
        const cleanLocation = (candidate.location || "Unknown").replace(/[^\x20-\x7E]/g, '');
        // split headline if it's too long
        const headLocationLines = pdf.splitTextToSize(`${cleanHeadline} | ${cleanLocation}`, pageWidth - textStartX - margin);
        pdf.text(headLocationLines, textStartX, currentY + 11);

        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0);
        const fitTextY = currentY + 14 + (headLocationLines.length * 5);
        pdf.text(`Overall Fit: `, textStartX, fitTextY);
        pdf.setTextColor(isFit ? 34 : 220, isFit ? 197 : 38, isFit ? 94 : 38); // Green (#22c55e) / Red (#dc2626)
        pdf.text(isFit ? "YES (Strong Match)" : "NO (Needs Improvement)", textStartX + 25, fitTextY);
        pdf.setTextColor(0, 0, 0);

        currentY = Math.max(fitTextY + 10, afterPicY);

        checkPageBreak(40);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0);
        
        // --- SUMMARY & WORK EXPERIENCE ---
        pdf.text("Candidate Summary & Profile", margin, currentY);
        currentY += 6;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        const cleanSummary = (candidate.summary || "No summary available.").replace(/[^\x20-\x7E]/g, '');
        const summaryLines = pdf.splitTextToSize(cleanSummary, pageWidth - margin * 2);
        
        // Draw summary line by line to allow pages breaking
        for(let line of summaryLines) {
           checkPageBreak(8);
           pdf.text(line, margin, currentY);
           currentY += 5;
        }
        currentY += 5;
        
        // --- VISUALIZATION: MATCHED VS MISSING SKILLS ---
        checkPageBreak(40);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("Skills Analysis Visualization", margin, currentY);
        currentY += 8;
        
        const matchedArr = Array.isArray(candidate.matched_skills) ? candidate.matched_skills : [];
        const missingArr = Array.isArray(candidate.missing_skills) ? candidate.missing_skills : [];
        const totalSkills = Math.max(matchedArr.length + missingArr.length, 1);
        const matchedPct = (matchedArr.length / totalSkills) * 100;
        const missingPct = (missingArr.length / totalSkills) * 100;
        
        // Draw Matched Skills Bar
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(34, 197, 94); // Green
        pdf.text(`Matched Skills (${matchedArr.length})`, margin, currentY);
        pdf.setFillColor(34, 197, 94);
        const maxBarWidth = pageWidth - margin * 2 - 50; 
        const matchedWidth = maxBarWidth * (matchedPct / 100);
        if(matchedWidth > 0) pdf.rect(margin + 48, currentY - 3.5, matchedWidth, 4, "F");
        currentY += 8;
        
        // Draw Missing Skills Bar
        pdf.setTextColor(239, 68, 68); // Red
        pdf.text(`Missing Skills (${missingArr.length})`, margin, currentY);
        pdf.setFillColor(239, 68, 68);
        const missingWidth = maxBarWidth * (missingPct / 100);
        if(missingWidth > 0) pdf.rect(margin + 48, currentY - 3.5, missingWidth, 4, "F");
        currentY += 10;
        
        pdf.setTextColor(0);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        const matchedText = matchedArr.length > 0 ? matchedArr.join(", ").replace(/[^\x20-\x7E]/g, '') : "None detected.";
        const matchedLines = pdf.splitTextToSize(`[Matched]: ${matchedText}`, pageWidth - margin * 2);
        for(let line of matchedLines) {
           checkPageBreak(8);
           pdf.text(line, margin, currentY);
           currentY += 5;
        }
        currentY += 3;
        
        const missingText = missingArr.length > 0 ? missingArr.join(", ").replace(/[^\x20-\x7E]/g, '') : "None detected.";
        const missingLines = pdf.splitTextToSize(`[Missing]: ${missingText}`, pageWidth - margin * 2);
        for(let line of missingLines) {
           checkPageBreak(8);
           pdf.text(line, margin, currentY);
           currentY += 5;
        }
        currentY += 10;
        
        // Divider between candidates
        pdf.setDrawColor(200);
        checkPageBreak(10);
        pdf.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 10;
      }

      // Add Top Candidates Table
      checkPageBreak(30);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0);
      pdf.text("Database Matches", margin, currentY);
      currentY += 8;

      pdf.setFillColor(248, 250, 252); // Slate background
      pdf.rect(margin, currentY, pageWidth - margin * 2, 8, "F");
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("Rank", margin + 2, currentY + 6);
      pdf.text("Name", margin + 15, currentY + 6);
      pdf.text("Location", margin + 80, currentY + 6);
      pdf.text("LinkedIn", margin + 125, currentY + 6);
      pdf.text("Match", pageWidth - margin - 20, currentY + 6);
      currentY += 12;

      pdf.setFont("helvetica", "normal");
      topCandidates.forEach((c, index) => {
        checkPageBreak(12); // if table row exceeds, break BEFORE rendering row

        const isFit = c.ats_score >= 70;
        pdf.text(`#${index + 1}`, margin + 2, currentY);
        
        // Ensure name isn't too long
        const cleanName = (c.name || "Unknown").replace(/[^\x20-\x7E]/g, '');
        const shortName = cleanName.length > 25 ? cleanName.substring(0, 22) + '...' : cleanName;
        pdf.text(shortName, margin + 15, currentY);
        
        // Ensure location isn't too long
        const cleanLoc = (c.location || "Unknown").replace(/[^\x20-\x7E]/g, '');
        const shortLoc = cleanLoc.length > 15 ? cleanLoc.substring(0, 12) + '...' : cleanLoc;
        pdf.text(shortLoc, margin + 80, currentY);

        if (c.linkedin_url && c.linkedin_url.includes("linkedin.com")) {
          pdf.setTextColor(0, 102, 204);
          pdf.textWithLink("Profile Link", margin + 125, currentY, { url: c.linkedin_url });
          pdf.setTextColor(0);
        } else {
          pdf.text("-", margin + 125, currentY);
        }

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(isFit ? 34 : 100, isFit ? 197 : 100, isFit ? 94 : 100);
        pdf.text(`${Math.round(c.ats_score)}%`, pageWidth - margin - 20, currentY);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0);

        currentY += 8;
      });

      // --- PAGE BORDERS AND FOOTERS ---
      const pageCount = pdf.internal.pages.length - 1; 
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setDrawColor(30, 64, 175); // Blue 800
        pdf.setLineWidth(1);
        // Draw page margin border (x, y, w, h)
        pdf.rect(10, 10, pageWidth - 20, pageHeight - 20, "S");
        addFooter(pdf, i);
      }

      pdf.save(`Recruiter_Report.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Check console for details.");
    }
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return "bg-gradient-to-b from-yellow-500/20 to-amber-600/10 border-yellow-500/50 text-yellow-100 shadow-[0_0_20px_rgba(234,179,8,0.2)]";
      case 1: return "bg-gradient-to-b from-slate-400/20 to-slate-500/10 border-slate-400/50 text-slate-100 shadow-[0_0_20px_rgba(148,163,184,0.1)] scale-95";
      case 2: return "bg-gradient-to-b from-blue-400/20 to-primary/10 border-primary/50 text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.15)] scale-95";
      default: return "bg-white/5 border-white/10 text-slate-300 scale-90 opacity-80";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full"
        />
        <h2 className="text-xl font-medium tracking-wide">Ranking Candidates...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans">

      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px]"></div>
      </div>

      <div ref={reportRef} className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Recruiter Toolbar - REMOVED (now in header) */}

        {/* Cart Management */}
        {candidateCart.length > 0 && (
          <div className="mb-8 p-6 bg-primary/10 border border-primary/30 rounded-2xl shadow-inner flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h4 className="text-foreground font-bold text-lg flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-primary" />
                Candidates in Cart ({candidateCart.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {candidateCart.map((c: any, i: number) => (
                  <div key={i} className="bg-primary/20 text-foreground border border-primary/30 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm shadow-primary/20">
                    {c.name}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                setCandidateCart([]);
                localStorage.removeItem("recruiterCart");
              }}
              className="bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors flex-shrink-0 cursor-pointer"
            >
              Clear Cart
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-panel rounded-2xl p-6 flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold text-foreground opacity-60 uppercase tracking-wider mb-1">Total Pool</p>
              <h3 className="text-4xl font-bold text-foreground group-hover:text-primary transition-colors">{candidates.length}</h3>
            </div>
            <div className="bg-primary/20 p-4 rounded-2xl text-primary group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8" />
            </div>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="glass-panel rounded-2xl p-6 flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold text-foreground opacity-60 uppercase tracking-wider mb-1">Avg Match</p>
              <h3 className="text-4xl font-bold text-foreground group-hover:text-emerald-500 transition-colors">{averageScore}%</h3>
            </div>
            <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 ${averageScore > 70 ? 'bg-emerald-500/20 text-emerald-600' : 'bg-yellow-500/20 text-yellow-500'}`}>
              <TrendingUp className="w-8 h-8" />
            </div>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="glass-panel rounded-2xl p-6 flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold text-foreground opacity-60 uppercase tracking-wider mb-1">Top Talent</p>
              <h3 className="text-2xl font-bold text-foreground truncate max-w-[160px] group-hover:text-amber-500 transition-colors">{topCandidates[0]?.name || "N/A"}</h3>
            </div>
            <div className="bg-amber-500/20 p-4 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform">
              <Crown className="w-8 h-8" />
            </div>
          </motion.div>
        </div>

        {/* Top 5 Leaderboard */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Award className="w-6 h-6 text-primary" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-primary">Top Candidates</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end min-h-[220px]">
            {topCandidates.map((c, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, type: "spring" }}
                className={`relative rounded-2xl p-6 border flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-2 ${getRankStyle(index)}`}
              >
                <div className="absolute -top-5">
                  {index === 0 && <Crown className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)] animate-float" />}
                  {index === 1 && <span className="text-4xl">🥈</span>}
                  {index === 2 && <span className="text-4xl">🥉</span>}
                </div>

                <div className="mt-4 w-full">
                  <h4 className="font-bold text-lg truncate w-full mb-1">{c.name}</h4>
                  <p className="text-[10px] opacity-70 uppercase tracking-widest mb-4 truncate">{c.location}</p>

                  <div className="mt-auto bg-black/20 rounded-xl py-2 px-3 backdrop-blur-sm">
                    <span className="text-3xl font-bold tracking-tighter">{Math.round(c.ats_score)}%</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Detailed Table */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-primary/20">
          <div className="p-6 border-b border-primary/10 bg-background/50 flex justify-between items-center">
            <h2 className="font-bold text-lg text-foreground">Full Candidate Ranking</h2>
            <Badge variant="outline" className="text-foreground opacity-60 border-primary/20">{candidates.length} Profiles</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-primary/10 text-left text-xs font-semibold text-foreground opacity-60 uppercase tracking-wider bg-background/30">
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">Candidate</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Key Skills</th>
                  <th className="px-6 py-4">Match</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {candidates.map((c, index) => (
                  <tr key={index} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-4 text-foreground opacity-70 font-mono text-sm">#{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground group-hover:text-primary transition-colors">{c.name}</div>
                      <div className="text-xs text-foreground opacity-50 truncate max-w-[200px] mt-0.5">{c.headline}</div>
                    </td>
                    <td className="px-6 py-4 text-foreground opacity-70 text-sm">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-foreground opacity-50" /> {c.location}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {c.skills.slice(0, 3).map((skill: string) => (
                          <Badge key={skill} variant="secondary" className="bg-background text-foreground px-2 py-0.5 text-[10px] border border-primary/20 hover:bg-primary/10">
                            {skill}
                          </Badge>
                        ))}
                        {c.skills.length > 3 && (
                          <span className="text-xs text-foreground opacity-50 pl-1 self-center">+{c.skills.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold text-lg ${c.ats_score > 70 ? 'text-emerald-500' : c.ats_score > 50 ? 'text-yellow-500' : 'text-foreground opacity-60'}`}>
                        {Math.round(c.ats_score)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={() => {
                            setEditingCandidate({ ...c, skills: c.skills.join(", ") });
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                          onClick={() => handleDeleteCandidate(c.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modals */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background border border-primary/20 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
              <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-foreground/50 hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-foreground">
                <Plus className="text-emerald-500" /> Add New Candidate
              </h2>
              <div className="space-y-4">
                <input placeholder="Name" className="w-full bg-primary/5 border border-primary/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" value={newCandidate.name} onChange={e => setNewCandidate({...newCandidate, name: e.target.value})} />
                <input placeholder="Headline" className="w-full bg-primary/5 border border-primary/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" value={newCandidate.headline} onChange={e => setNewCandidate({...newCandidate, headline: e.target.value})} />
                <input placeholder="Location" className="w-full bg-primary/5 border border-primary/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" value={newCandidate.location} onChange={e => setNewCandidate({...newCandidate, location: e.target.value})} />
                <input placeholder="Skills (comma separated)" className="w-full bg-primary/5 border border-primary/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" value={newCandidate.skills} onChange={e => setNewCandidate({...newCandidate, skills: e.target.value})} />
                <input placeholder="LinkedIn URL" className="w-full bg-primary/5 border border-primary/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" value={newCandidate.linkedin_url} onChange={e => setNewCandidate({...newCandidate, linkedin_url: e.target.value})} />
                <Button onClick={handleAddCandidate} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">Save Candidate</Button>
              </div>
            </motion.div>
          </div>
        )}

        {isEditModalOpen && editingCandidate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background border border-primary/20 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
              <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 text-foreground/50 hover:text-foreground">
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-foreground">
                <Pencil className="text-primary" /> Edit Candidate
              </h2>
              <div className="space-y-4">
                <input placeholder="Name" className="w-full bg-primary/5 border border-primary/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" value={editingCandidate.name} onChange={e => setEditingCandidate({...editingCandidate, name: e.target.value})} />
                <input placeholder="Headline" className="w-full bg-primary/5 border border-primary/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" value={editingCandidate.headline} onChange={e => setEditingCandidate({...editingCandidate, headline: e.target.value})} />
                <input placeholder="Location" className="w-full bg-primary/5 border border-primary/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" value={editingCandidate.location} onChange={e => setEditingCandidate({...editingCandidate, location: e.target.value})} />
                <input placeholder="Skills (comma separated)" className="w-full bg-primary/5 border border-primary/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" value={editingCandidate.skills} onChange={e => setEditingCandidate({...editingCandidate, skills: e.target.value})} />
                <input placeholder="LinkedIn URL" className="w-full bg-primary/5 border border-primary/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" value={editingCandidate.linkedin_url} onChange={e => setEditingCandidate({...editingCandidate, linkedin_url: e.target.value})} />
                <Button onClick={handleUpdateCandidate} className="w-full bg-primary text-white">Update Candidate</Button>
              </div>
            </motion.div>
          </div>
        )}

      </div>
    </div>
  );
}
