GOOGLE REVIEWS UPDATE
Read REVIEW-SETUP.md first. Reviews now require the Node server and Google OAuth client ID. Run npm install, configure .env, then npm start. Opening index.html directly only shows the static portfolio.

NIDHEESH KUMAR — COMPLETE PORTFOLIO / CATEGORY SKILLS

Extract the ZIP and open index.html. Keep style.css, script.js and assets/ alongside it.
Home, About, preloader, Projects and Experience are retained from your latest complete portfolio.

SKILLS
Open category rows: Frontend, Backend, Database and Tools.
Click/tap a technology to show its knowledge, or click again to collapse.
Category chevrons toggle the last selected technology. Buttons support Enter and Space.
Edit names and knowledge in the Skills markup in index.html (data-knowledge and visible initial text).
The old flip cards and automatic tilt controls have been removed.
Boxicons are bundled locally in assets/boxicons/ and work offline.

PROJECTS
Smashpro plus two demo slots. Edit the projects array near the end of script.js to set URLs and descriptions.
Desktop: hover continuously for 5 seconds to open a preview. Moving away cancels the timer. Mouse clicks do not bypass the delay. On phones, tap to open; keyboard Enter or Space also opens directly. Escape or close button dismisses it.
Use Open website if a project blocks embedding.

EXPERIENCE
Edit placeholder milestones in index.html. Replace logos in assets/logos/ or update image paths.
Add assets/cv.pdf to enable Download CV. Fonts still use the original online Google Fonts URLs.

PROJECT GLASS
Frosted project surfaces, staggered gloss sweeps and cursor-controlled reflections/tilt. Reduced motion disables animations. Gloss sweeps pause when Projects is offscreen.

CONTACT AND HANGING VISIT TAG
Small footer counter starts at 150. A small draggable tag appears when About enters view, follows scroll progress, and falls onto the counter when the footer is visible, adding +1 once per page load. The count is a decorative local animation, NOT shared visitor analytics. Refresh resets it to 150.
Drag the tag freely; keyboard arrows scroll, Home goes to About, End goes to Contact. Reduced motion skips the fall animation.
Configure email, LinkedIn and GitHub in contactDetails near the end of script.js. Placeholder links are inactive until configured. The form prepares a mailto message in the visitor's email app; it does not send email by itself or use a server.
All prior sections and separate HTML/CSS/JavaScript are included.

FILE STRUCTURE (unified)
index.html, style.css, script.js plus assets/. Nothing else is needed; the old skills-section/ folder was removed because Skills already lives inside these three files.

SIZING (all sections follow Home)
The end of style.css holds one "UNIFIED SECTION SYSTEM" block. It defines --u = one Home design pixel (window width / 1672, the same --k script.js sets for the hero).
Every section uses the Home values: 84 side inset, 15px eyebrow with 72px line, 76px headline, 35px lead, 20px intro text, 68px / 18.4px buttons with 12px radius.
To make all sections bigger or smaller together, edit the tokens at the top of that block (--fs-title, --fs-body, --inset, --sec-y ...).
script.js ends with a small scroll-reveal block using the same rise-and-fade as Home.

