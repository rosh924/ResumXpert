import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Briefcase, Search, ArrowRight, Upload, FileText, CheckCircle } from "lucide-react";

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

export default function SeekerHome({ onStart }: { onStart: (data: any) => void }) {
  // Extension Data State
  const [extensionData, setExtensionData] = useState<any>(null);

  // Manual Flow State
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Common State
  const [jobRole, setJobRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRoles = jobRoles.filter((role) =>
    role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get("data");

    if (dataParam) {
      try {
        const data = JSON.parse(dataParam);
        if (data.mode === "seeker") {
          setExtensionData(data); // Store extension data
        }
      } catch (e) {
        console.error("Failed to parse URL data:", e);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  const handleContinue = () => {
    const payload: any = {
      job_role: jobRole,
      job_description: jobDescription,
    };

    if (extensionData) {
      payload.extensionData = extensionData;
    } else if (resumeFile) {
      payload.resumeFile = resumeFile;
    }

    onStart(payload);
  };

  const handleRoleSelect = (role: string) => {
    setJobRole(role);
    setSearchTerm(role);
    setShowDropdown(false);
  };

  // Validation for Continue
  const canContinue = jobRole.trim() && (resumeFile || extensionData);

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
        className="w-full max-w-4xl relative z-10"
      >
        <div className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden backdrop-blur-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/25"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-5xl font-bold text-foreground mb-4 tracking-tight">
              Resum<span className="text-primary">Xpert</span> <span className="text-2xl opacity-70">for Seekers</span>
            </h1>
            <p className="text-xl text-foreground opacity-80 max-w-2xl mx-auto">
              Analyze your profile against your target role to get a personalized ATS report and learning roadmap.
            </p>
          </div>

          {extensionData && (
            <div className="mb-8 p-6 bg-primary/10 border border-primary/30 rounded-2xl flex items-center gap-4 text-foreground">
              <div className="bg-primary text-primary-foreground p-3 rounded-full">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Profile Data Loaded from Extension</h3>
                <p className="opacity-70 text-sm">We have your profile details ({extensionData.name}). Please provide the Target Job details below.</p>
              </div>
            </div>
          )}

          <div className="bg-background/40 border border-primary/20 rounded-2xl p-8 mb-8 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-6">
              <Briefcase className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-bold text-foreground opacity-80 uppercase tracking-wider">Target Job Details</h3>
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
                <label className="block text-sm font-medium text-foreground mb-2">Job Description (Optional but Recommended)</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the target job description here..."
                  rows={4}
                  className="w-full bg-background/50 border border-primary/20 rounded-xl p-4 text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                />
              </div>

              {/* File Upload OR Manual */}
              {!extensionData && (
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
              Analyze Profile <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}