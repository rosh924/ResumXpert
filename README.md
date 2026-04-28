ResumeXpert: AI-Powered Talent Matching & Optimization
ResumeXpert is a dual-purpose platform designed to bridge the gap between job seekers and recruiters. By leveraging Large Language Models (LLMs), it provides deep analytical insights into resumes, offering real-time ATS (Applicant Tracking System) optimization for candidates and automated candidate screening for recruiters.

🚀 Features
For Job Seekers (LinkedIn Extension)
ATS Score Analysis: Instantly evaluate how well your resume matches a specific job description.

Skill Gap Detection: Identifies missing hard and soft skills required for the role.

AI Recommendations: Specific suggestions to improve bullet points and formatting for better parsing.

For Recruiters (Web Dashboard)
Automated Data Extraction: Parses complex PDF/Docx resumes into structured data.

Confidence Ratings: Assigns an AI-driven "Fit Score" based on experience, education, and technical proficiency.

Bulk Screening: Quickly filter hundreds of applicants to find the top 5% of matches.

🛠️ Technical Stack
Frontend: React.js, Tailwind CSS, Chrome Extension API

Backend: FastAPI (Python)

AI/LLM: Groq & Gemini APIs (via LangChain)

Real-time Communication: WebSockets for live analysis updates

Database: PostgreSQL (for storing candidate profiles and job history)

📦 Installation & Setup
Prerequisites
Node.js (v18+)

Python (3.9+)

API keys for Groq or Google Gemini

Backend Setup
Clone the repository:

Bash
git clone https://github.com/rosh924/ResumeXpert.git
cd ResumeXpert/backend
Create a virtual environment and install dependencies:

Bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
Create a .env file and add your API keys:

Code snippet
GROQ_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
Start the server:

Bash
uvicorn main:app --reload
Chrome Extension Setup
Navigate to chrome://extensions/ in your browser.

Enable Developer mode (toggle in the top right).

Click Load unpacked and select the extension/ folder from this repository.

📑 Project Structure
Plaintext
ResumeXpert/
├── backend/            # FastAPI server & AI logic
│   ├── agents/         # LLM prompt templates and chains
│   └── main.py         # API endpoints
├── extension/          # Chrome extension source code
│   ├── content.js      # LinkedIn DOM scraping
│   └── popup/          # Extension UI
└── web-app/            # React dashboard for recruiters
🤝 Contributing
Fork the Project.

Create your Feature Branch (git checkout -b feature/AmazingFeature).

Commit your Changes (git commit -m 'Add some AmazingFeature').

Push to the Branch (git push origin feature/AmazingFeature).

Open a Pull Request.

📄 License
Distributed under the MIT License. See LICENSE for more information.
