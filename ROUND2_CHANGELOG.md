# Round 2 — School logo, signature, stamp + images on PDFs

## What's in this zip

| File | What it does |
|---|---|
| `src/lib/imageLoader.js` | **NEW.** Fetches Cloudinary URLs and converts to base64 for jsPDF. |
| `src/lib/pdfGenerator.js` | **REPLACE.** Now async. Prefetches all images before rendering. |
| `src/lib/ducamsTemplate.js` | **REPLACE.** DUCAMS template renders actual logo/photo/signature/stamp when present. |
| `src/components/SchoolBrandingSection.jsx` | **NEW.** Drop-in component for the Settings page — 3 image upload widgets. |
| `src/pages/reports/ReportCardView.jsx` | **REPLACE.** Awaits async PDF generation, shows "Building…" state. |
| `src/pages/reports/PDFPreviewModal.jsx` | **REPLACE.** Handles async pdfFactory with a loading spinner. |

## Step 1 — Unzip

Unzip at the project root. It'll replace / add the files above.

## Step 2 — Add SchoolBrandingSection to your Settings page

Open **`src/pages/settings/SettingsPage.jsx`** (or wherever your Settings School tab lives).

**At the top of the file, add this import:**
```jsx
import SchoolBrandingSection from '../../components/SchoolBrandingSection'
```

**Find the School tab render** — the section where school name, address, phone, motto, principal name, etc. are shown. At the bottom of that tab, before the closing tag, add:

```jsx
<SchoolBrandingSection school={school} />
```

That's it — the component handles its own save button and Firestore updates. It reads and writes:
- `school.logoUrl`
- `school.principalSignatureUrl`
- `school.stampUrl`

## Step 3 — Restart and test

1. `npm run dev`
2. Go to **Settings → School** — you'll see a new "School branding" section with three upload boxes
3. Upload a school logo, a signature (best: sign on white paper, snap a clear photo, upload — Cloudinary handles the rest), and a stamp
4. Click **Save branding**
5. Go to a student → **Preview** or **PDF**
6. You should see:
   - Your logo where the placeholder circle was in the header
   - The student's photo where the gray box was (if you uploaded one)
   - Your signature at the bottom-right, above a signature line labelled "Principal's signature"
   - Your stamp in the far bottom-right corner

## What you'll notice differently

- **PDF generation is now slightly slower** (1-3 seconds) because it fetches images from Cloudinary first. The "PDF" button shows a spinner and says "Building…" while it works.
- **PDF Preview** shows a loading spinner too, with a message about fetching images.
- **On-screen preview** (the modal you see before hitting Preview/PDF) also now shows your logo, student photo, signature, and stamp inline.

## What to expect for images

**Good source images:**
- **Logo**: PNG with transparent background, roughly square
- **Signature**: Sign in black ink on plain white paper, take a well-lit photo. Cloudinary URL parameters (which we set in the preset) will handle the sizing. For best results in the PDF, use a transparent PNG later.
- **Stamp**: Round or square PNG, transparent background if possible

**Working image = URL that loads in a browser tab.** If the image doesn't load when you open the Cloudinary URL directly, it won't render in the PDF either.

## What's NOT in this round

- Other templates (Classic, Modern, Elegant) don't render the images yet — only DUCAMS. Tell me when to update those.
- No background removal (for signatures/stamps on white paper). Cloudinary can do this automatically with paid plans — for now, use transparent PNGs if you can.
- Teacher signatures on the class teacher's report line (only Principal's signature is wired up).

## If something breaks

- **"Cannot read properties of undefined (reading 'logo')"** → make sure `pdfGenerator.js` was replaced (the async version passes `images` to the template)
- **"images.logo is not a function"** → the template file wasn't updated
- **Signature/stamp doesn't appear on PDF but shows in the on-screen preview** → the image URL didn't fetch (CORS or 404). Check the browser console — look for "Image fetch failed" warnings.
- **PDF stuck on "Building…" forever** → check console for network errors, likely a Cloudinary URL that returns 404
