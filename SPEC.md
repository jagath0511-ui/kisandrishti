# SPEC.md — KisanDrishti (working title)

> Read this whole file before writing any code.
> If any request conflicts with Section 4 (Safety Rules), follow Section 4 and tell the developer.

## 1. What we are building

A mobile-first web app that helps small farmers in India:

1. Find out what is wrong with a sick crop from a photo (Crop Doctor).
2. Get stage-wise treatment: organic first, chemical only if needed.
3. Stay safe while using chemicals (toxicity class, protective gear, first aid, emergency flow).
4. Check whether the weather is safe for spraying.
5. Do a simple DIY soil test with a jar and a photo.
6. Find a few key government schemes.

Key idea: **the AI diagnoses, a verified database prescribes.** The AI model never invents doses.

## 2. Users and conditions

- Small farmers; first target region: Andhra Pradesh and Telangana.
- Low-end Android phones, slow mobile data, bright sunlight.
- Languages: Telugu, Hindi, English. Many users prefer listening to reading.
- Design and test at 360px width first (small phone).

## 3. Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS + lucide-react
- Gemini API called ONLY from the server file `app/api/agri-diagnose/route.ts`, using the official `@google/genai` SDK. Check the current official docs for exact syntax.
- Model name comes from the env var `GEMINI_MODEL` (default `gemini-2.5-flash`). Never hard-code it in many places.
- Weather: Open-Meteo (free, no key). Check its docs for the exact request format.
- Voice: browser Web Speech API (`speechSynthesis`), language codes `te-IN`, `hi-IN`, `en-IN`.
- Validation: `zod`. Tests: `vitest`.
- No database for the MVP. Data lives in JSON files; the spray diary uses `localStorage`.
- Deploy on Vercel.

## 4. SAFETY RULES (never break these)

1. The AI model NEVER provides chemical names, doses, dilution ratios, pre-harvest intervals or toxicity classes. Only `data/treatments.json` provides them.
2. A chemical entry is shown to the user ONLY if `verified: true` AND `source_url` is not empty. Otherwise show organic steps plus "Ask your agriculture officer or Krishi Vigyan Kendra (KVK)".
3. Unverified chemical fields must never be sent to the browser at all (filter on the server).
4. Gemini may choose `treatment_key` ONLY from the list of keys we give it, or null. The server checks this again.
5. Confidence rules (enforced by the SERVER, not the model):
   - score below 0.5 = low: no treatment, ask for a better photo.
   - 0.5 to 0.75 = medium: show organic steps and a warning "Not fully sure, confirm with an expert". Do not show chemical stage.
   - above 0.75 = high: show organic steps and chemical stage (if verified).
6. Every screen that shows a chemical must also show: the toxicity class card, protective gear (PPE), and "Read the product label first. The label is the final authority."
7. The Emergency flow is static: no AI call, works without internet after the first load.
8. Never display an accuracy number that we did not measure ourselves with the test set.
9. Do not store or log user photos. Never put the API key in browser code or in Git.
10. Show a short disclaimer: "This app gives guidance, not a replacement for an agriculture officer or doctor."

## 5. Features

| ID | Feature | Notes |
|----|---------|-------|
| F1 | Crop Doctor | Photo, compress in browser, send to API route, show diagnosis |
| F2 | Stage-gated treatment | Stage 1 organic; Stage 2 chemical (collapsed, with warnings) |
| F3 | Safety card | Toxicity class (color + words + icon), PPE, handling, first-aid summary |
| F4 | Emergency flow | Skin / Eyes / Breathed in / Swallowed; helpline call buttons |
| F5 | Safe Harvest Date | Spray date + pre-harvest interval = earliest harvest date; saved in localStorage |
| F6 | Spray Safety Check | Weather-based: Good time / Wait / Do not spray, with reasons and best hours |
| F7 | Soil test | Jar test photo with draggable layer lines, USDA texture class, rough pH test |
| F8 | Schemes page | 4 or 5 central schemes: one plain sentence + official link + last-checked date |
| F9 | Voice and language | Listen button on key screens; UI in Telugu, Hindi, English |
| F10 | (Optional) Mix calculator | Dose per litre x tank size = amount per tank, verified entries only |

## 6. Data shapes

### 6.1 Gemini diagnosis output (strict JSON schema)

```json
{
  "is_plant_photo": true,
  "image_quality": "good | fair | poor",
  "crop": "string or null",
  "problem_type": "fungal | bacterial | viral | pest | nutrient_deficiency | environmental | healthy | unknown",
  "problem_name": "plain English name",
  "treatment_key": "one allowed key, or null",
  "confidence_score": 0.0,
  "affected_area_range": "none | under_10 | 10_to_30 | 30_to_60 | over_60 | unknown",
  "visible_symptoms": ["string"],
  "reasoning": "short, simple words, in the farmer's chosen language",
  "retake_advice": "string or null"
}
```

The server turns `confidence_score` into `confidence` (low / medium / high) using Safety Rule 5.

### 6.2 data/treatments.json (one object per disease)

```json
{
  "key": "chilli_anthracnose",
  "crop": "chilli",
  "type": "fungal",
  "name": { "en": "", "te": "", "hi": "" },
  "symptoms": { "en": "", "te": "", "hi": "" },
  "stage1_organic": [ { "en": "", "te": "", "hi": "" } ],
  "stage2_chemical": [
    {
      "chemical_name": "TODO_VERIFY",
      "dose_per_litre": "TODO_VERIFY",
      "pre_harvest_interval_days": null,
      "toxicity_class": "TODO_VERIFY",
      "ppe": ["gloves", "face mask", "full-sleeve clothes"],
      "source_url": "",
      "source_note": "",
      "verified": false
    }
  ]
}
```

`toxicity_class` values and colors (India's label system):
- `extremely_toxic` = Red
- `highly_toxic` = Yellow
- `moderately_toxic` = Blue
- `slightly_toxic` = Green

Never fill `chemical_name`, `dose_per_litre`, `pre_harvest_interval_days` or `toxicity_class` from AI memory. A human fills them from official sources and sets `verified` to true.

### 6.3 config/spray-rules.ts (starting values, to be checked by an agriculture expert)

- Rain chance of 40% or more in the next 6 hours: WAIT
- Wind speed of 15 km/h or more: DO NOT SPRAY
- Temperature of 32 C or more: avoid; spray early morning or evening
- Humidity of 85% or more with warm weather: tell the farmer fungal disease spreads fast, re-check crop in 2 days
- Best spraying hours: early morning and late afternoon, when rain chance, wind and heat are all below the limits

### 6.4 data/schemes.json

```json
{
  "id": "pm-kisan",
  "name": { "en": "", "te": "", "hi": "" },
  "one_line": { "en": "", "te": "", "hi": "" },
  "official_url": "",
  "last_checked": "YYYY-MM-DD"
}
```

Do not write benefit amounts or eligibility rules unless the developer pastes the text from the official site.

## 7. Folder structure

```
app/
  page.tsx                  home screen
  doctor/page.tsx          crop doctor
  soil/page.tsx            soil test
  weather/page.tsx         spray safety check
  schemes/page.tsx
  emergency/page.tsx
  api/agri-diagnose/route.ts
components/
lib/
  gemini.ts  treatments.ts  harvestDate.ts  soilTexture.ts
  sprayRules.ts  weather.ts  speech.ts  imageCompress.ts
  rateLimit.ts  i18n.ts
data/
  treatments.json  first-aid.json  schemes.json  districts.json
locales/
  en.json  te.json  hi.json
config/
  spray-rules.ts  helplines.ts
tests/
eval/
  images/  labels.csv
scripts/
  eval.ts
```

## 8. Design rules

- Large text (minimum 16px body), large buttons (minimum 48px tall), high contrast for outdoor sunlight.
- Never use color alone. Toxicity classes show color + words + icon.
- Simple short sentences. One main action per screen.
- A red "Emergency" button is visible in the header on every screen.
- Every important result has a "Listen" button.
- Friendly loading, empty and error states (slow network is normal).

## 9. Environment variables

```
GEMINI_API_KEY=       (server only, never commit)
GEMINI_MODEL=gemini-2.5-flash
```

`.env.local` is for the real values. `.env.example` has empty placeholders and is committed.

## 10. Testing

Write unit tests (vitest) for the pure functions:

- `soilTexture`: 40/40/20 sand/silt/clay = loam; 90/5/5 = sand; 20/20/60 = clay; 65/25/10 = sandy loam; 10/85/5 = silt; results must sum to 100.
- `harvestDate`: spray date + interval days.
- `sprayRules`: each rule triggers correctly at, below and above its limit.
- `treatments` lookup: unverified entries never return chemical data; unknown keys return null.
- Confidence rules from Safety Rule 5.

Also keep a real-photo test set in `eval/` (see PROMPTS.md).

## 11. Definition of done

- Full flow works on a real phone using the deployed Vercel link: photo, diagnosis, treatment, safety card, emergency.
- No safety rule is broken (run the audit prompt).
- Telugu and Hindi text reviewed by a native speaker.
- First-aid text reviewed by a doctor or pharmacist.
- Treatment entries shown in the demo are verified with a source URL.
- README has screenshots, setup steps, test results and limits.

