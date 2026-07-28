# Yourkids&i Academy — Public Website

A distinctive, warm, kid-friendly website for the school. Sits inside your existing BramTech Records project — same domain, same deploy, no separate infrastructure.

## What you get

Five public pages, all wired into one navigation:

- `/` — Home (hero, programs preview, extras band, why-us, testimonials, CTA)
- `/programs` — full detail on the 4 programs
- `/about` — mission, story, values
- `/events` — upcoming and past events
- `/contact` — full contact + WhatsApp-integrated registration form
- `/check-result` — (already built in Round 1) linked from the nav

## Design language

- **Palette:** Deep Plum, Coral Pink, Sunshine Yellow, Sky Blue, Cream White, Soft Blush
- **Fonts:** Bricolage Grotesque (display), Manrope (body), Caveat (handwritten accents) — loaded automatically from Google Fonts
- **Signature:** Pill-shaped tags used as the visual grammar throughout — nav, section labels, buttons, category chips
- **Vibe:** Warm and playful but disciplined. One bold accent per section. Mobile-first.

## Files delivered

```
src/data/schoolContent.js               ← ALL content lives here — edit this file to change text
src/components/site/Pill.jsx            ← the signature pill component
src/components/site/SiteNav.jsx         ← sticky top nav with mobile menu
src/components/site/SiteFooter.jsx      ← plum footer with contact + links
src/components/site/SiteLayout.jsx      ← wraps every site page
src/pages/site/HomePage.jsx             ← landing page
src/pages/site/ProgramsPage.jsx         ← all 4 programs in detail
src/pages/site/AboutPage.jsx            ← mission, story, values
src/pages/site/EventsPage.jsx           ← events list
src/pages/site/ContactPage.jsx          ← form + all contact channels
```

## SETUP CHECKLIST

### ☐ 1. Drop the files in

Extract the zip into your project root. Everything lands in the correct `src/` paths.

### ☐ 2. Add the routes

Open your routing file (probably `src/App.jsx` or wherever `<Routes>` lives).

Add the site routes **outside any authenticated wrapper** — they must be public:

```jsx
import HomePage from './pages/site/HomePage'
import ProgramsPage from './pages/site/ProgramsPage'
import AboutPage from './pages/site/AboutPage'
import EventsPage from './pages/site/EventsPage'
import ContactPage from './pages/site/ContactPage'

// Inside your <Routes>:
<Route path="/" element={<HomePage />} />
<Route path="/programs" element={<ProgramsPage />} />
<Route path="/about" element={<AboutPage />} />
<Route path="/events" element={<EventsPage />} />
<Route path="/contact" element={<ContactPage />} />
```

**Important:** if your existing app currently redirects `/` to the admin dashboard, move the admin dashboard to a different path like `/dashboard` or `/admin`. The public site should own `/`.

Suggested new structure:
- `/` → HomePage (public)
- `/programs`, `/about`, `/events`, `/contact` → public
- `/check-result` → public (Round 1)
- `/dashboard`, `/students`, `/reports`, `/settings/*` → admin (authenticated)

### ☐ 3. Verify fonts load

Open the home page in a browser. Section titles should render in a chunky sans-serif (Bricolage Grotesque). Handwritten "and", "actually", "starts here" etc. should be in Caveat (script style). If they look wrong, the Google Fonts link failed to load — check the browser console.

### ☐ 4. Test the WhatsApp form

Go to `/contact`, fill out the form, submit. WhatsApp should open in a new tab with the school's number and a pre-filled message. If the phone number isn't right, edit `src/data/schoolContent.js` → `school.whatsapp` (international format, no plus, no spaces).

### ☐ 5. Update the content

All the placeholder copy is in **`src/data/schoolContent.js`**. Search for `// EDIT:` comments — those mark the places most likely to change:

- School name, tagline
- Phone numbers, email, address
- Hours
- Program descriptions and age ranges
- Extras and differentiators
- About/mission/story
- Events

You do not need to touch any of the `.jsx` files to update content. Just edit the data file.

## Content that will need replacing eventually

Not urgent, but worth planning for:

- **Real photos.** Every current design uses colored shapes and Caveat text as placeholders. Once the school takes photos of classrooms, children (with parent permission), teachers, events — the site will feel significantly warmer. Photos should be uploaded to Cloudinary and referenced by URL.
- **Real testimonials.** Placeholder quotes are in `schoolContent.js` under `testimonials`. Ask 3-4 happy parents to give a real one.
- **Real events.** The events file has 4 placeholder events. Replace with actual school calendar as they come up.
- **Logo.** The current logo is an inline SVG mark I made based on the flyer's mascot idea. If the school has an actual logo file, we can swap it in — send it and I'll wire it up.

## What next

- **Round 3:** Backup system (Google Drive integration + on-demand download + scheduling)
- **Round 4:** Teacher role restructure (permission system)
- **Later:** Real photos, real logo, real testimonials, gallery page, blog if the school wants one

Test the site, tell me it looks right, and we ship the next round.
