document.getElementById("analyze").onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async () => {
      try {
        // Auto-scroll the page to force LinkedIn to load lazy content (like Skills)
        await new Promise((resolve) => {
          let totalHeight = 0;
          let distance = 800;
          let maxScrolls = 40; 
          let currentScroll = 0;
          
          let timer = setInterval(() => {
            window.scrollBy(0, distance);
            totalHeight += distance;
            currentScroll++;

            // Aggressively click any "Show all X" or "See all" buttons while scrolling
            const elementsToClick = document.querySelectorAll('button, a, span.artdeco-button__text');
            for(let el of elementsToClick) {
              // Strictly forbid clicking on anything in right-sidebar or 'People also viewed' sections
              if (el.closest && el.closest('aside, .scaffold-layout__aside, .right-rail')) continue;
              const text = (el.innerText || "").toLowerCase().trim();
              if ((text.includes('show all') || text.includes('see all') || text.includes('show more')) && (text.includes('skills') || text === 'show all' || text === 'show more')) {
                try { el.click(); } catch(e) {}
              }
            }

            // Forcibly remove 'visually-hidden' classes to expose hidden text
            document.querySelectorAll('.visually-hidden, .sr-only').forEach(el => {
               el.classList.remove('visually-hidden', 'sr-only');
            });

            if (currentScroll >= maxScrolls || totalHeight >= document.body.scrollHeight) {
              clearInterval(timer);
              window.scrollTo(0, 0); // scroll back to top
              setTimeout(resolve, 2000); // Wait 2s for all React nodes to finish rendering
            }
          }, 150);
        });

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
          if (titleName && titleName !== "LinkedIn" && titleName !== "Feed" && !titleName.includes("Search")) {
             // LinkedIn titles typically have " | LinkedIn" or similar, so split by "|" or "-" often leaves the exact name
             const namePart = titleName.split('-')[0].trim();
             return namePart.replace('LinkedIn', '').trim();
          }

          // If all else fails, query specific elements that house names
          const nameEl = document.querySelector('h1.text-heading-xlarge[data-test-id="hero__headline"]');
          if (nameEl) return clean(nameEl.innerText);

          return "";
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
          let skills = new Set();
          
          // Method 1: Target the skill pills in the new UI explicitly
          const skillPills = document.querySelectorAll('a[data-field="skill_card_skeleton"] span[aria-hidden="true"], a[href*="/details/skills/"] span[aria-hidden="true"], .pv-skill-category-entity__name-text');
          skillPills.forEach(el => {
              if (el.innerText && el.innerText.trim().length > 1) {
                  skills.add(el.innerText.trim());
              }
          });

          // Method 2: Target the "About" or "Skills" summary sections specifically
          const skillSummaryContainers = document.querySelectorAll('.pv-about-section .pv-about__summary-text, .inline-show-more-text--is-collapsed span[aria-hidden="true"]');
          const exactNoise = ["show all", "endorse", "all", "skills", "messaging", "notifications", "me", "for business", "learning", "jobs", "network", "home", "search", "back", "next", "save", "try premium", "enhance profile", "add section", "show details", "hide details", "top skills"];
          
          const isNoise = (s) => {
              const lower = s.toLowerCase();
              if (s.length < 2 || s.length > 50) return true;
              if (exactNoise.some(n => lower === n)) return true;
              if (lower.includes("endorse") || lower.includes("show all") || lower.includes("mutual connection") || lower.includes(" at ") || lower.includes(" working in ") || lower.includes(" connections") || lower.includes(" followers") || lower.endsWith("...") || /^\d/.test(lower)) return true;
              return false;
          };

          // Method 3: Fallback to the aggressive text-line parsing only if DOM methods failed to find anything
          if (skills.size === 0) {
            let startIndex = textLines.findIndex(l => {
              const lower = l.toLowerCase();
              return lower === 'skills' || lower === 'top skills' || lower === 'skills & endorsements' || lower === 'skills and endorsements';
            });

            if (startIndex === -1 && window.location.href.includes('/details/skills')) {
              startIndex = 0;
            }

            if (startIndex !== -1) {
              let consecutiveFailures = 0;
              for (let i = startIndex + 1; i < textLines.length; i++) {
                const line = textLines[i];
                const lowerLine = line.toLowerCase();
                const stopSections = [
                  "interests", "languages", "certifications", "education", 
                  "experience", "projects", "honors & awards", "volunteering", 
                  "recommendations", "causes", "people also viewed", "you might like", 
                  "similar profiles", "others named"
                ];

                if (!window.location.href.includes('/details/skills') && stopSections.includes(lowerLine)) break;

                if (!isNoise(line)) {
                  skills.add(line);
                  consecutiveFailures = 0;
                } else {
                  consecutiveFailures++;
                }

                if (consecutiveFailures > 50) break;
                if (skills.size > 150) break;
              }
            }
          }

          return Array.from(skills);
        };

        const getProfilePicture = () => {
          const headerSelectors = [
            ".ph5 .pv-top-card-profile-picture__image", 
            ".ph5 img.profile-photo-edit__preview",
            ".ph5 img.ghost-person",
            "section:first-of-type .pv-top-card__photo img",
            "img.pv-top-card-profile-picture__image",
            "img.profile-photo-edit__preview"
          ];

          for (const sel of headerSelectors) {
            const img = document.querySelector(sel);
            // Must be an actual image, not a base64 GIF blank placeholder
            if (img && img.src && !img.src.includes('data:image/gif')) {
              return img.src;
            }
          }

          return null; // Don't fall back to random navigation avatars
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
