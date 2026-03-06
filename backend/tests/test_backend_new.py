import unittest
from unittest.mock import patch, MagicMock
import json
import io
import sys
import os

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app

class TestBackendNew(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    @patch('app.analyze_gap_with_groq')
    @patch('app.calculate_ats_score')
    def test_analyze_seeker_json_extension(self, mock_ats, mock_gap_analysis):
        # Mock Groq Gap Analysis
        mock_gap_analysis.return_value = {
            "missing_skills": ["Docker", "Kubernetes"],
            "roadmap": [{"skill": "Docker", "duration": "1 week", "topic": "Containers"}],
            "course_topics": ["Docker for Beginners"],
            "projects": []
        }

        # Mock ATS Score (Return tuple)
        mock_ats.return_value = (85.5, [])

        payload = {
            "mode": "extension",
            "job_role": "Software Engineer",
            "job_description": "We need Python and Cloud skills.",
            "extension_data": {
                "name": "John Doe",
                "headline": "Python Developer",
                "location": "New York",
                "skills": ["Python", "Flask", "React"]
            }
        }

        response = self.app.post('/analyze-seeker', 
                                 data=json.dumps(payload),
                                 content_type='application/json')

        self.assertEqual(response.status_code, 200)
        data = response.json
        self.assertEqual(data['candidate']['name'], "John Doe")
        self.assertEqual(data['ats_score'], 85.5)
        self.assertIn("Docker", data['missing_skills'])

    @patch('app.extract_text_from_pdf')
    @patch('app.extract_candidate_details_with_groq') # Switched to Groq mock
    @patch('app.analyze_gap_with_groq') # Updated to Groq
    @patch('app.calculate_ats_score')
    def test_analyze_seeker_pdf_upload(self, mock_ats, mock_gap_analysis, mock_extract_details, mock_extract_text):
        # 1. Mock PDF Text Extraction
        mock_extract_text.return_value = "Resume content for Jane Doe..."

        # 2. Mock Candidate Details Extraction (Groq)
        mock_extract_details.return_value = {
            "name": "Jane Doe",
            "headline": "Data Scientist",
            "location": "London",
            "skills": ["Python", "Pandas", "Scikit-Learn"]
        }

        # 3. Mock Gap Analysis (Groq)
        mock_gap_analysis.return_value = {
            "missing_skills": ["TensorFlow", "Deep Learning"],
            "roadmap": [{"skill": "TensorFlow", "duration": "2 weeks", "topic": "Basics"}],
            "course_topics": ["TensorFlow for Beginners"],
            "projects": []
        }

        # 4. Mock ATS (Score only)
        mock_ats.return_value = (90.0, []) # Helper returns tuple

        # Create a specific mock for file
        data = {
            'resume': (io.BytesIO(b"percent PDF header"), 'resume.pdf'),
            'job_role': 'Data Scientist',
            'job_description': 'Looking for ML experts.'
        }

        response = self.app.post('/analyze-seeker', 
                                 data=data,
                                 content_type='multipart/form-data')

        self.assertEqual(response.status_code, 200)
        json_data = response.json
        self.assertEqual(json_data['candidate']['name'], "Jane Doe")
        self.assertEqual(json_data['ats_score'], 90.0)
        self.assertIn("TensorFlow", json_data['missing_skills'])

if __name__ == '__main__':
    unittest.main()
