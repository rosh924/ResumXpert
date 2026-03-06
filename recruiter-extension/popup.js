document.getElementById("analyze").onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      try {
        // Helper to clean text
        const clean = (text) => text ? text.replace(/\s+/g, ' ').trim() : "";

        // robust selectors for LinkedIn Profile
        const textLines = document.body.innerText.split('\n').map(l => clean(l)).filter(l => l.length > 0);

        const getName = () => {
          const selectors = [
            "h1.text-heading-xlarge",
            ".pv-text-details__left-panel h1",
            ".inline.t-24.t-black.t-normal.break-words",
            "h1"
          ];
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && clean(el.innerText)) return clean(el.innerText);
          }

          // Fallback to page title
          let titleName = clean(document.title.split('|')[0]);
          if (titleName && titleName !== "LinkedIn") return titleName;

          return textLines.length > 0 ? textLines[0] : "";
        };

        const getHeadline = () => {
          const selectors = [
            ".text-body-medium.break-words",
            ".pv-text-details__left-panel .mt2",
            "div[data-generated-suggestion-target]"
          ];
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && clean(el.innerText)) return clean(el.innerText);
          }

          // Fallback: search for the name in the text lines, the headline is usually right after it
          const name = getName().toLowerCase();
          let nameIdx = textLines.findIndex(l => l.toLowerCase().includes(name));
          if (nameIdx !== -1 && nameIdx + 1 < textLines.length) {
            return textLines[nameIdx + 1];
          }

          const meta = document.querySelector('meta[property="og:description"]');
          return meta ? clean(meta.content) : "";
        };

        const getLocation = () => {
          const selectors = [
            ".text-body-small.inline.t-black--light.break-words",
            ".pv-text-details__left-panel .pb2 .text-body-small",
            "span.text-body-small"
          ];
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            // Location is usually short but > 2, e.g. "Seattle, WA" or "San Francisco Bay Area"
            if (el && el.innerText) {
              const text = clean(el.innerText);
              if (text && text.length > 2 && !text.includes('followers') && !text.includes('connections')) return text;
            }
          }

          // Fallback: search lines after headline for typical location string (contains comma or 'Area')
          const headline = getHeadline().toLowerCase();
          let headIdx = textLines.findIndex(l => l.toLowerCase() === headline);
          if (headIdx !== -1) {
            for (let i = headIdx + 1; i < headIdx + 5; i++) {
              if (i < textLines.length) {
                const text = textLines[i];
                if (text.includes('followers') || text.includes('connections')) continue;
                // Locations often have commas (City, Country)
                if (text.includes(',') || text.includes('Area')) return text;
              }
            }
          }

          return "";
        };

        const getSkills = () => {
          let skills = [];

          // These are exact matches to ignore
          const exactNoise = [
            "show all", "endorse", "endorsed", "passed", "assessment", "connections", "·", "and",
            "industry knowledge", "tools & technologies", "interpersonal skills", "other skills",
            "all", "skills", "endorsement", "endorsements", "messaging", "notifications",
            "me", "for business", "learning", "jobs", "network", "home", "search",
            "back", "next", "save", "try premium", "enhance profile", "add section",
            "show details", "hide details", "top skills", "languages", "certifications",
            "recommendations", "courses", "honors & awards", "organizations"
          ];

          const isNoise = (s) => {
            if (!s || s.length < 2 || s.length > 50) return true;

            const lower = s.toLowerCase();

            // Check exact matches
            if (exactNoise.some(n => lower === n)) return true;

            // Check substring matches (LinkedIn UI garbage)
            if (
              lower.includes("endorse") ||
              lower.includes("show all") ||
              lower.includes("mutual connection") ||
              lower.includes(" at ") || // e.g. "Software Engineer at Google"
              lower.includes(" working in ") ||
              lower.includes(" connections") ||
              lower.includes(" followers") ||
              lower.endsWith("...") || // Truncated text
              /^\d/.test(lower) // Starts with a number (like "12 endorsements")
            ) {
              return true;
            }

            return false;
          };


          // Find where the Skills section begins
          let startIndex = textLines.findIndex(l => l.toLowerCase() === 'skills');

          // If we are on the dedicated skills page, we can just start from the top
          if (startIndex === -1 && window.location.href.includes('/details/skills')) {
            startIndex = 0;
          }

          if (startIndex !== -1) {
            let consecutiveFailures = 0;
            // Iterate down the page text grabbing everything that looks like a skill
            for (let i = startIndex + 1; i < textLines.length; i++) {
              const line = textLines[i];
              const lowerLine = line.toLowerCase();

              // Stop condition: We hit another major profile section header
              const stopSections = ["interests", "languages", "certifications", "education", "experience", "projects", "honors & awards", "volunteering", "recommendations", "causes"];
              if (!window.location.href.includes('/details/skills') && stopSections.includes(lowerLine)) {
                break;
              }

              if (!isNoise(line)) {
                skills.push(line);
                consecutiveFailures = 0;
              } else {
                consecutiveFailures++;
              }

              // If we hit 50 garbage lines in a row, we've probably wandered into the footer
              if (consecutiveFailures > 50) break;

              // Hard cap
              if (skills.length > 150) break;
            }
          }

          return [...new Set(skills)];
        };

        const getProfilePicture = () => {
          const selectors = [
            "img.pv-top-card-profile-picture__image--show",
            "img.pv-top-card-profile-picture__image",
            "img.profile-photo-edit__preview",
            "img.ghost-person",
            ".pv-top-card__photo img",
            ".presence-entity__image",
            ".global-nav__me img",
            "img.global-nav__me-photo",
            "img[alt^='Profile photo of']",
            "img[src*='profile-displayphoto-shrink']"
          ];

          for (const sel of selectors) {
            const img = document.querySelector(sel);
            if (img && img.src && !img.src.includes('data:image/gif')) {
              return img.src;
            }
          }

          return null;
        };

        const profile = {
          mode: "recruiter",
          name: getName(),
          headline: getHeadline(),
          location: getLocation(),
          skills: getSkills(),
          picture: getProfilePicture(),
          linkedin_url: window.location.href,
        };

        if (!profile.name && !profile.headline) {
          alert("ResumXpert: Could not extract profile data. Please make sure you are on a LinkedIn Profile page.");
          return;
        }

        if (profile.skills.length === 0) {
          alert("ResumXpert: No skills found! LinkedIn hides your skills until you scroll down. Please SCROLL DOWN to the 'Skills' section on your profile and click the extension again.");
          return;
        }

        // Open local dev or production URL
        // Using localhost for now as per user environment
        const baseUrl = "http://localhost:5174/";
        const queryParams = new URLSearchParams();
        queryParams.set("data", JSON.stringify(profile));

        window.open(`${baseUrl}?${queryParams.toString()}`, "_blank");
      } catch (err) {
        alert("ResumXpert Error: " + err.message + "\n\n" + err.stack);
      }
    }
  });
};
