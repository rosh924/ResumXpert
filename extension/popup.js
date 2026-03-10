document.getElementById("analyze").onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async () => {
      try {
        console.log("ResumXpert: Starting Extraction (v1.3)...");

        const cleanText = (t) => t ? t.replace(/\s+/g, ' ').trim() : "";

        // --- STEP 1: PRE-EXTRACT IDENTITY ---
        const getIdentity = () => {
          const id = {
            name: "Candidate",
            headline: "Career Professional",
            location: "Unknown",
            picture: null
          };

          const title = document.title;
          if (title && title.includes('|')) {
            let namePart = cleanText(title.split('|')[0]);
            namePart = namePart.replace(/^\(\d+\)\s+/, '');
            const isNoisy = (s) => ["skills", "experience", "about", "interests", "education", "linkedin", "feed"].some(h => s.toLowerCase().includes(h));
            if (namePart && namePart.length > 1 && !isNoisy(namePart)) {
              id.name = namePart;
            }
          }

          if (id.name === "Candidate") {
            const h1 = document.querySelector('h1.text-heading-xlarge, section.pv-top-card h1, .pv-text-details__left-panel h1');
            const h1Text = cleanText(h1?.innerText);
            if (h1Text && h1Text.length > 1 && !["skills", "experience", "about"].some(s => h1Text.toLowerCase().includes(s))) {
              id.name = h1Text;
            }
          }

          const headEl = document.querySelector('section.pv-top-card .text-body-medium, .ph5 .mt2, .text-body-medium.break-words');
          const headText = cleanText(headEl?.innerText);
          if (headText && headText.length > 2 && headText.toLowerCase() !== "all") {
            id.headline = headText;
          }

          const locEl = document.querySelector('.text-body-small.inline.t-black--light.break-words, .pv-text-details__left-panel .pb2 .text-body-small');
          const locText = cleanText(locEl?.innerText);
          if (locText && locText.length > 2 && !locText.includes('follower') && !locText.includes('connection')) {
            id.location = locText;
          }

          const pic = document.querySelector('img.pv-top-card-profile-picture__image--show, .pv-top-card-profile-picture__image, .pv-top-card__photo img, img.profile-photo-edit__preview');
          if (pic && pic.src && !pic.src.includes('data:image/gif')) {
            id.picture = pic.src;
          } else {
             const allImgs = Array.from(document.querySelectorAll('img'));
             for(let img of allImgs) {
               if (img.src.includes('profile-displayphoto-shrink') && !img.src.includes('data:image/gif')) {
                 id.picture = img.src;
                 break;
               }
             }
          }
          return id;
        };

        const identity = getIdentity();

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
            const elementsToClick = document.querySelectorAll('button, a, span.artdeco-button__text');
            for(let el of elementsToClick) {
              if (el.closest && el.closest('aside, .scaffold-layout__aside, .right-rail')) continue;
              const text = (el.innerText || "").toLowerCase().trim();
              if ((text.includes('show all') || text.includes('see all')) && text.includes('skills')) {
                try { el.click(); } catch(e) {}
              }
            }
            document.querySelectorAll('.visually-hidden, .sr-only').forEach(el => {
               el.classList.remove('visually-hidden', 'sr-only');
            });
            if (currentScroll >= maxScrolls || totalHeight >= document.body.scrollHeight) {
              clearInterval(timer);
              window.scrollTo(0, 0); 
              setTimeout(resolve, 2000); 
            }
          }, 150);
        });

        // --- STEP 3: EXTRACT SKILLS ---
        const getSkills = () => {
          const skills = new Set();
          const pills = document.querySelectorAll('a[href*="/details/skills/"] span[aria-hidden="true"], .pv-skill-category-entity__name-text');
          pills.forEach(el => {
            const s = cleanText(el.innerText);
            if (s && s.length > 1 && !s.toLowerCase().includes('endorsement') && !s.toLowerCase().includes('endorsed by') && s !== "Skills" && s !== "Show all") {
              skills.add(s);
            }
          });
          if (skills.size === 0) {
            const pageLines = document.body.innerText.split('\n').map(l => cleanText(l)).filter(l => l.length > 0);
            const idx = pageLines.findIndex(line => ["skills", "top skills", "skills & endorsements"].includes(line.toLowerCase()));
            if (idx !== -1) {
              for (let i = idx + 1; i < pageLines.length && i < idx + 40; i++) {
                const line = pageLines[i];
                if (line.toLowerCase().includes('endorsement')) continue;
                if (line.length > 1 && line.length < 50 && !["skills", "about", "experience", "education"].some(s => line.toLowerCase().includes(s))) {
                  skills.add(line);
                }
              }
            }
          }
          return Array.from(skills);
        };

        const finalSkills = getSkills();

        // --- STEP 4: PACKAGE AND REDIRECT ---
        const profileData = {
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
