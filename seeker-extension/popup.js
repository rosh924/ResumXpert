document.getElementById("analyze").onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async () => {
      try {
        console.log("ResumXpert: Starting Extraction (v1.3)...");

        const cleanText = (t) => t ? t.replace(/\s+/g, ' ').trim() : "";

        // --- STEP 1: PRE-EXTRACT IDENTITY (Name, Headline, Location, Photo) ---
        // We do this BEFORE any scrolling or potential navigation.

        const getIdentity = () => {
          const id = {
            name: "Candidate",
            headline: "Career Professional",
            location: "Unknown",
            picture: null
          };

          // 1. Name from Title (very reliable if not on details page)
          const title = document.title;
          if (title && title.includes('|')) {
            let namePart = cleanText(title.split('|')[0]);
            // Strip notification counts like (1) 
            namePart = namePart.replace(/^\(\d+\)\s+/, '');

            const isNoisy = (s) => ["skills", "experience", "about", "interests", "education", "linkedin", "feed"].some(h => s.toLowerCase().includes(h));
            if (namePart && namePart.length > 1 && !isNoisy(namePart)) {
              id.name = namePart;
            }
          }

          // 2. Name from Top Card H1 (if title was noisy)
          if (id.name === "Candidate") {
            const h1 = document.querySelector('h1.text-heading-xlarge, section.pv-top-card h1, .pv-text-details__left-panel h1');
            const h1Text = cleanText(h1?.innerText);
            if (h1Text && h1Text.length > 1 && !["skills", "experience", "about"].some(s => h1Text.toLowerCase().includes(s))) {
              id.name = h1Text;
            }
          }

          // 3. Headline
          const headEl = document.querySelector('section.pv-top-card .text-body-medium, .ph5 .mt2, .text-body-medium.break-words');
          const headText = cleanText(headEl?.innerText);
          if (headText && headText.length > 2 && headText.toLowerCase() !== "all") {
            id.headline = headText;
          }

          // 4. Location
          const locEl = document.querySelector('.text-body-small.inline.t-black--light.break-words, .pv-text-details__left-panel .pb2 .text-body-small');
          const locText = cleanText(locEl?.innerText);
          if (locText && locText.length > 2 && !locText.includes('follower') && !locText.includes('connection')) {
            id.location = locText;
          }

          // 5. Photo
          const pic = document.querySelector('img.pv-top-card-profile-picture__image--show, .pv-top-card-profile-picture__image, .pv-top-card__photo img, img.profile-photo-edit__preview');
          if (pic && pic.src && !pic.src.includes('data:image/gif')) {
            id.picture = pic.src;
          } else {
            const allImgs = Array.from(document.querySelectorAll('img'));
            for (let img of allImgs) {
              if (img.src.includes('profile-displayphoto-shrink') && !img.src.includes('data:image/gif')) {
                id.picture = img.src;
                break;
              }
            }
          }

          return id;
        };

        const identity = getIdentity();
        console.log("ResumXpert: Identity Found:", identity);

        // --- STEP 2: SCROLL AND LOAD SKILLS ---
        await new Promise((resolve) => {
          let totalHeight = 0;
          let distance = 800;
          let maxScrolls = 25;
          let currentScroll = 0;

          let timer = setInterval(() => {
            window.scrollBy(0, distance);
            totalHeight += distance;
            currentScroll++;

            // Improved "Show all skills" clicker
            const buttons = Array.from(document.querySelectorAll('button, a'));
            for (let el of buttons) {
              const text = (el.innerText || "").toLowerCase().trim();
              const isSkillsButton = (text.includes('show all') || text.includes('see all')) && text.includes('skills');
              const isNotSidebar = !el.closest('aside, .scaffold-layout__aside, .right-rail');

              if (isSkillsButton && isNotSidebar) {
                try {
                  el.click();
                  console.log("ResumXpert: Clicked Show All Skills");
                } catch (e) { }
              }
            }

            document.querySelectorAll('.visually-hidden, .sr-only').forEach(el => {
              el.classList.remove('visually-hidden', 'sr-only');
            });

            if (currentScroll >= maxScrolls || totalHeight >= document.body.scrollHeight) {
              clearInterval(timer);
              window.scrollTo(0, 0);
              setTimeout(resolve, 1500);
            }
          }, 200);
        });

        // --- STEP 3: EXTRACT SKILLS ---
        const getSkills = () => {
          const skills = new Set();

          // 1. Primary: Direct skill pills/links
          const selectors = [
            'a[href*="/details/skills/"] span[aria-hidden="true"]',
            '.pv-skill-category-entity__name-text',
            '.pvs-list__item-trim-container span[aria-hidden="true"]',
            '#skills ~ .pvs-list__outer-container .pvs-list__item-trim-container span[aria-hidden="true"]',
            '.pv-skills-section__pill-text'
          ];

          selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
              const s = cleanText(el.innerText);
              if (s && s.length > 1 &&
                !s.toLowerCase().includes('endorsement') &&
                !s.toLowerCase().includes('endorsed by') &&
                !["skills", "show all", "see all", "endorse"].includes(s.toLowerCase())) {
                skills.add(s);
              }
            });
          });

          // 2. Fallback: Section-based traversal
          if (skills.size === 0) {
            console.log("ResumXpert: Primary extraction failed, trying fallback...");
            const pageLines = document.body.innerText.split('\n').map(l => cleanText(l)).filter(l => l.length > 0);
            const idx = pageLines.findIndex(line => ["skills", "top skills", "skills & endorsements"].includes(line.toLowerCase()));
            if (idx !== -1) {
              for (let i = idx + 1; i < pageLines.length && i < idx + 50; i++) {
                const line = pageLines[i];
                if (line.toLowerCase().includes('endorsement') || line.toLowerCase().includes('endorsed by')) continue;
                if (line.length > 1 && line.length < 60 &&
                  !["skills", "about", "experience", "education", "interests", "languages", "show all"].some(s => line.toLowerCase().includes(s))) {
                  skills.add(line);
                }
              }
            }
          }
          return Array.from(skills);
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

          return null;
          return null; // Don't fall back to random navigation avatars
        };

        const profile = {
          mode: "seeker",
          ...identity,
          skills: finalSkills
        };

        if (profileData.skills.length === 0) {
          alert("ResumXpert: Skills not found. Please scroll down to the 'Skills' section on your LinkedIn profile and click the extension again.");
          return;
        }

        const baseUrl = "http://localhost:5173/";
        const params = new URLSearchParams();
        params.set("data", JSON.stringify(profileData));

        window.open(`${baseUrl}?${params.toString()}`, "_blank");
      } catch (err) {
        alert("ResumXpert Error: " + err.message);
      }
    }
  });
};
