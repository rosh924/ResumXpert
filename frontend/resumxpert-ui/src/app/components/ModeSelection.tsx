import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserSearch, Users, Sparkles, Briefcase, Search, ArrowRight, Upload, FileText, CheckCircle } from "lucide-react";

// Job roles data
const jobRoles = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Scientist",
  "Data Analyst",
  "Product Manager",
  "UX/UI Designer",
  "DevOps Engineer",
  "Machine Learning Engineer",
  "Marketing Manager",
  "Business Analyst",
];

export default function ModeSelection({ onSelect }: any) {

  const [selectedMode, setSelectedMode] = useState<"seeker" | "recruiter" | null>(null);

  // Extension Data State
  const [extensionData, setExtensionData] = useState<any>(null);

  // Manual Flow State
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Common State
  const [jobRole, setJobRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Recruiter Mode State
  const [candidateCart, setCandidateCart] = useState<any[]>([]);

  const filteredRoles = jobRoles.filter((role) =>
    role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    // Load existing cart from local storage
    let currentCart: any[] = [];
    const storedCart = localStorage.getItem("recruiterCart");
    if (storedCart) {
      try {
        currentCart = JSON.parse(storedCart);
        setCandidateCart(currentCart);
      } catch (e) { }
    }

    const query = window.location.search.substring(1);
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get("data");

    if (dataParam) {
      try {
        const data = JSON.parse(dataParam);
        if (data.mode === "seeker") {
          setSelectedMode("seeker");
          setExtensionData(data); // Store extension data

          // Synchronous auto-add to recruiter cart if not already present, avoiding Strict Mode double-queue 
          const exists = currentCart.find((p: any) => p.name === data.name);
          if (!exists) {
            const newCart = [...currentCart, data];
            localStorage.setItem("recruiterCart", JSON.stringify(newCart));
            setCandidateCart(newCart);
          }
        }
      } catch (e) {
        console.error("Failed to parse URL data:", e);
      }
    } else if (query) {
      // Legacy fallback for old URL format if needed, but let's stick to new clean format
      // ... existing legacy code if strictly necessary ...
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  const handleContinue = () => {
    if (!selectedMode) return;

    // Prepare payload
    const payload: any = {
      mode: selectedMode,
      job_role: jobRole,
      job_description: jobDescription,
    };

    if (selectedMode === "seeker") {
      if (extensionData) {
        // Flow 1: Extension Data
        payload.extensionData = extensionData;
      } else if (resumeFile) {
        // Flow 2: File Upload
        payload.resumeFile = resumeFile;
      } else {
        // Should not happen due to validation, but handle graceful error or default
        // alert("Please upload a resume or use the extension.");
        // return;
      }
    } else if (selectedMode === "recruiter") {
      // If there are candidates in the cart, add them
      let finalCandidates: any[] = [];
      if (candidateCart.length > 0) {
        finalCandidates = [...candidateCart];
      }

      payload.candidates = finalCandidates;
    }

    onSelect(payload);
  };

  const handleRoleSelect = (role: string) => {
    setJobRole(role);
    setSearchTerm(role);
    setShowDropdown(false);
  };

  // Validation for Continue
  const isSeekerReady = selectedMode === "seeker" && jobRole.trim() && (resumeFile || extensionData);
  const isRecruiterReady = selectedMode === "recruiter" && jobRole.trim() && candidateCart.length > 0;
  const canContinue = isSeekerReady || isRecruiterReady;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">

      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-20%] w-[800px] h-[800px] bg-orange-400/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] left-[-20%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl relative z-10"
      >
        {/* Main Glass Card */}
        <div className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden backdrop-blur-2xl">

          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/25"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>

            <h1 className="text-5xl font-bold text-foreground mb-4 tracking-tight">
              Resum<span className="text-primary">Xpert</span>
            </h1>

            <p className="text-xl text-foreground opacity-80 max-w-2xl mx-auto">
              AI-powered intelligence for <span className="font-bold">Candidates</span> and <span className="font-bold">Recruiters</span>.
              Optimize your career path or find top talent instantly.
            </p>
          </div>

          {/* Mode Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Job Seeker Card */}
            <motion.div
              whileHover={{ y: -5, scale: 1.02 }}
              onClick={() => setSelectedMode("seeker")}
              className={`cursor-pointer rounded-2xl p-8 border-2 transition-all duration-300 relative overflow-hidden group ${selectedMode === "seeker"
                ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(255,150,68,0.2)]"
                : "border-primary/20 bg-background/50 hover:border-primary/50 hover:bg-primary/5"
                }`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500 text-foreground">
                <UserSearch className="w-32 h-32" />
              </div>

              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors ${selectedMode === "seeker" ? "bg-primary text-primary-foreground" : "bg-foreground/10 text-foreground group-hover:bg-primary/20 group-hover:text-primary"
                  }`}>
                  <UserSearch className="w-7 h-7" />
                </div>

                <h3 className="text-2xl font-bold text-foreground mb-2">Job Seeker</h3>
                <p className="text-foreground opacity-70 leading-relaxed text-sm">
                  Analyze your profile, check ATS scores, identify skill gaps, and get a personalized learning roadmap.
                </p>
              </div>
            </motion.div>

            {/* Recruiter Card */}
            <motion.div
              whileHover={{ y: -5, scale: 1.02 }}
              onClick={() => setSelectedMode("recruiter")}
              className={`cursor-pointer rounded-2xl p-8 border-2 transition-all duration-300 relative overflow-hidden group ${selectedMode === "recruiter"
                ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(255,150,68,0.2)]"
                : "border-primary/20 bg-background/50 hover:border-primary/50 hover:bg-primary/5"
                }`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500 text-foreground">
                <Users className="w-32 h-32" />
              </div>

              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors ${selectedMode === "recruiter" ? "bg-primary text-primary-foreground" : "bg-foreground/10 text-foreground group-hover:bg-primary/20 group-hover:text-primary"
                  }`}>
                  <Users className="w-7 h-7" />
                </div>

                <h3 className="text-2xl font-bold text-foreground mb-2">Recruiter</h3>
                <p className="text-foreground opacity-70 leading-relaxed text-sm">
                  Bulk analyze candidate profiles, rank talent by role fit, and visualize recruitment data.
                </p>
              </div>
            </motion.div>
          </div>

          {extensionData && selectedMode === 'seeker' && (
            <div className="mb-8 p-6 bg-primary/10 border border-primary/30 rounded-2xl flex items-center gap-4 text-foreground">
              <div className="bg-primary text-primary-foreground p-3 rounded-full">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Profile Data Loaded from Extension</h3>
                <p className="opacity-70 text-sm">We have your profile details ({extensionData.name}). Please provide the Job Description below to continue.</p>
              </div>
            </div>
          )}

          {/* Job Details Input Section */}
          <motion.div
            initial={false}
            animate={{
              height: selectedMode ? "auto" : 0,
              opacity: selectedMode ? 1 : 0
            }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="bg-background/40 border border-primary/20 rounded-2xl p-8 mb-8 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-6">
                <Briefcase className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground opacity-80 uppercase tracking-wider">Job Details</h3>
              </div>

              <div className="space-y-6">


                {/* Job Role Input */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Target Job Role</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground opacity-50">
                      <Search className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setJobRole(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="e.g. Frontend Developer"
                      className="w-full bg-background/50 border border-primary/20 rounded-xl py-4 pl-12 pr-4 text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                    {showDropdown && filteredRoles.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-background border border-primary/20 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                        {filteredRoles.map((role) => (
                          <div
                            key={role}
                            onClick={() => handleRoleSelect(role)}
                            className="px-4 py-3 cursor-pointer text-foreground hover:bg-primary/10 transition-colors border-b border-primary/10 last:border-0"
                          >
                            {role}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Job Description Input */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Job Description</label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here (skills, requirements, responsibilities)..."
                    rows={4}
                    className="w-full bg-background/50 border border-primary/20 rounded-xl p-4 text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                  />
                </div>

                {/* Candidate Details Inputs (File Upload OR Manual for Recruiter) */}
                {selectedMode === 'seeker' && !extensionData && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground mb-2">Resume / LinkedIn Profile (PDF)</label>
                    <div className={`border-2 border-dashed border-primary/20 rounded-xl p-8 transition-colors ${resumeFile ? "bg-primary/10 border-primary" : "hover:bg-primary/5 hover:border-primary/40"}`}>
                      <input
                        type="file"
                        id="resume-upload"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label htmlFor="resume-upload" className="flex flex-col items-center cursor-pointer">
                        {resumeFile ? (
                          <>
                            <FileText className="w-12 h-12 text-primary mb-3" />
                            <span className="text-foreground font-medium text-lg">{resumeFile.name}</span>
                            <span className="text-foreground opacity-60 text-sm mt-1">Click to change</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-12 h-12 text-foreground opacity-50 mb-3" />
                            <span className="text-foreground font-medium text-lg">Upload Resume or LinkedIn PDF</span>
                            <span className="text-foreground opacity-50 text-sm mt-1">PDF format supported</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                )}



              </div>
            </div>

            {/* Continue Button */}
            <div className="flex justify-center pb-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleContinue}
                disabled={!canContinue}
                className={`px-10 py-4 rounded-xl font-bold text-lg flex items-center gap-2 shadow-xl transition-all ${canContinue
                  ? "bg-gradient-to-r from-orange-400 to-orange-600 text-primary-foreground hover:shadow-orange-500/25"
                  : "bg-foreground/10 text-foreground/40 cursor-not-allowed"
                  }`}
              >
                Continue Assessment <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}