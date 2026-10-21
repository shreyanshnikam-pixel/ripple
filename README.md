# Ripple: see the reaction before you decide

**Ripple** is a decision simulator for civic life. You type a decision, like
*"Ban phones during class"* or *"Ban members of Congress from trading stocks"*, and
Ripple builds a crowd of 1,000 simulated people (parents, students, retirees, small
business owners and more) and shows how they would react, argue and change their
minds over a year. Then it connects the simulation to the real world: your
congressional district, real bills in Congress, your representative, and a survey
you can send to real people to check the prediction.

It is built for the moments when a decision lands on other people: student
councils, city councils, families, small businesses and members of Congress.

## What it does

### The simulator

| Feature | What you see |
| --- | --- |
| **Live reading** | As you type, Ripple shows the topics it detects, the setting, and whether a real poll exists for this kind of decision. |
| **Verdict + reality check** | Net support with a for/undecided/against split, and where the starting point came from: a published poll (linked) or a labeled estimate, plus every adjustment for your wording. |
| **The crowd** | 1,000 dots. Press play to watch opinions spread from Day 1 to Year 1. Hover a group to find its people. |
| **Voices, crosstabs, over time, town hall** | One voice per group in their own words, support by group, a timeline, and a simulated forum where the voices answer each other. |
| **Who's in the room** | A college town vs. a retirement community, a student vote vs. a staff meeting, or **your own congressional district's real population**. |
| **Fixes** | Narrower versions and add-ons (a pilot, an opt-out, help with costs), each tested by re-running the simulation. |
| **AI report (optional)** | Claude writes a full report from the simulation's data: group by group, risks, recommendations, questions to ask real people, a voice for each group, and answers to follow-up questions. |
| **Take it further** | Who decides this for real (Congress, your city council, your school board), related bills, and a starter letter to your representative that cites real polls only. |
| **Listen for real** | Turn the question into a 30-second anonymous survey with a QR code, then watch real answers arrive next to Ripple's frozen prediction. |
| **Share** | A link that reproduces the exact result, a 1200×630 image card, and the phone's share menu. |

### Civic tools

| Page | What it does |
| --- | --- |
| **Your district** (`/district`) | Enter a ZIP code (looked up on your device). See your district's Census profile next to the national figures, your representative and senators, and simulate any decision with your district's real population. |
| **Real bills** (`/bills`) | 25 real bills and laws (stock trading, daylight saving time, kids' online safety, voting, minimum wage and more), each with a plain-language summary, its progress through Congress, the published poll on the idea, and a one-click simulation. |
| **Compare** (`/compare`) | Two wordings, one crowd, and a group-by-group chart of who moves. |
| **Methodology** (`/methodology`) | Every starting point and source, the 32 voices, live realism checks against real polls, and limitations. |

## Run it

Requires Node 22.13 or newer (surveys use Node’s built-in SQLite).

```bash
npm install
npm run dev        # web app on http://localhost:5173, API on http://localhost:8787
```

```bash
npm test           # 83 tests: engine, realism vs. real polls, districts, bills, letters, AI, surveys
npm run typecheck  # TypeScript, whole project
npm run build      # production build into dist/
npm start          # serve the built app and the API together on :8787
npm run build:pages  # static site for GitHub Pages (dist-pages/)
npm run build:demo   # single-file preview (dist-artifact/ripple.html)
```

### Turning on the AI report

The AI report is optional and uses Claude (`claude-opus-5-5`) through the official
Anthropic SDK.

- **On a server:** set `ANTHROPIC_API_KEY` before `npm start` or `npm run dev`. The key
  stays on the server, the server re-runs the simulation itself (so the model only sees
  Ripple's own data), and AI requests have their own rate limit and a daily cap
  (`AI_DAILY_LIMIT`, default 300). Refusals are retried on another model server-side
  (`fallbacks: "default"`).
- **On a static site:** visitors can paste their own Anthropic API key. It is used straight
  from their browser and kept only for that tab, or on that device if they choose.

### Putting it online (GitHub Pages)

1. Push this folder to a GitHub repository.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`. `.github/workflows/pages.yml` runs the tests and publishes the site to
   `https://<your-username>.github.io/<repository>/`.

The static site runs the whole simulation in the browser. Surveys switch to on-device
"pass the phone around" mode, and the AI report uses the visitor's own key. To get
shareable survey links and a server-side AI key, deploy the server (`npm start`) to any
Node host and set the repository variable `RIPPLE_API_URL` to its address.

## Demo video

`scripts/video/record-demo.mjs` records a captioned 1080p walkthrough of the running app (under 3 minutes) with
Playwright and ffmpeg, plus timed narration and captions. See `docs/SUBMISSION.md` for how to use it.

## How it's built

```
shared/              Shared by the server and the browser
  engine.ts            analyze → starting point → score → calibrate → crowd → report
  anchors.ts           well-known decisions: poll or estimate, stakes by role, voice lines
  anchors-civic.ts     Congress, elections and national policy (Pew, Gallup, AP-NORC, KFF…)
  bills.ts             25 verified bills and laws, mapped to the policies they're about
  districts.ts         Census measures → who's in the room, ZIP → district
  civics.ts            who decides, and the starter letter
  ai.ts                grounded context, report schema and Claude requests
  surveys.ts           tallies and the honest comparison with the prediction
  *.test.ts            83 tests
server/
  index.ts             Express API, validation, rate limits
  ai.ts                /api/ai: status, report, ask
  surveys.ts           /api/surveys with SQLite (node:sqlite)
scripts/build-district-data.ts   builds the district files from public data
client/src/
  pages/               Landing, Simulator, District, Bills, Compare, Survey, Methodology, About
  sim/                 Composer, results, AI panel, share sheet, take action, surveys
  components/          Canvas renderers, district picker, QR code, UI pieces
  data/                districts.json and zips.json (generated)
```

**Front end:** React 18, TypeScript, Vite, GSAP ScrollTrigger, Lenis, Framer Motion,
and hand-written Canvas 2D for the ripple field, the crowd and the share card.

**Back end:** Node + Express, input validation, rate limits, SQLite for surveys, and
the Anthropic SDK for the optional AI report. If the server is unreachable, the client
runs the same engine in the browser.

### The simulation engine

1. **Read the decision.** Topics, softening steps (pilot, opt-out, financial help,
   asking people first), all-or-nothing wording, whether it lifts a rule, the setting,
   and the closest well-known kind of decision (an "anchor").
2. **Start from reality.** If an anchor matches, Ripple starts from a published poll
   when one exists, or a labeled estimate. Then it adjusts for wording.
3. **Score each voice.** Each of 32 personas weighs the decision by its values *and*
   its own stake as a student, parent, retiree, business owner and so on.
4. **Calibrate.** Everyone shifts by the same amount so day-one support in the poll's
   population matches the starting point. Differences between groups stay intact.
5. **Crowd.** 1,000 agents in neighborhoods drift toward their neighbors' views over
   four moments (bounded-confidence opinion dynamics). The shock of change fades; on
   divisive topics, views harden.
6. **Report.** Crosstabs, quotes, a town hall, and fixes scored by re-running the model.

Results are deterministic: the same decision always gives the same report.

### Realism tests

`shared/realism.test.ts` checks the full simulation against real polls, for example:

| Decision | Real poll | Test |
| --- | --- | --- |
| Ban phones during class | 68% of adults ([Pew, 2024](https://www.pewresearch.org/short-reads/2024/10/14/most-americans-back-cellphone-bans-during-class-but-fewer-support-all-day-restrictions/)) | within ±7 |
| Ban members of Congress from trading stocks | 86% ([University of Maryland, 2023](https://drum.lib.umd.edu/items/6dbca567-f940-4897-bde1-02610cfb5ef6)) | within ±7 |
| Proof of citizenship to register to vote | 83% ([Gallup, 2024](https://news.gallup.com/poll/652523/americans-endorse-early-voting-voter-verification.aspx)) | within ±8 |
| Elect the president by popular vote | 63% ([Pew, 2024](https://www.pewresearch.org/short-reads/2024/09/25/majority-of-americans-continue-to-favor-moving-away-from-electoral-college/)) | within ±8 |
| Let Medicare negotiate drug prices | 85% ([KFF, 2024](https://www.kff.org/health-costs/allowing-medicare-to-negotiate-drug-prices-remains-broadly-popular-among-voters-though-most-are-unaware-of-the-law-and-its-projected-savings/)) | within ±7 |
| Ban TikTok | 34% ([Pew, 2025](https://www.pewresearch.org/short-reads/2025/03/25/fewer-americans-now-support-tiktok-ban-see-the-platform-as-a-national-security-threat-than-in-spring-2023/)) | within ±8 |
| Ban all devices at school | no poll | at most 12–20% support |

The Methodology page runs 24 of these checks live in the browser.

## Data sources

- **Polls:** Pew Research Center, Gallup, AP-NORC, KFF, the University of Maryland's
  Program for Public Consultation, Marist and others. Every source is linked in the app.
- **Districts:** U.S. Census Bureau, American Community Survey 2024 1-year estimates
  (119th Congress districts), and the 2020 ZIP Code Tabulation Area to district
  relationship file. Rebuild with `npx tsx scripts/build-district-data.ts` after
  downloading the files listed at the top of that script into `data/raw/`.
- **Members of Congress:** [unitedstates/congress-legislators](https://github.com/unitedstates/congress-legislators) (public domain).
- **Bills:** Congress.gov bill status data (via GovInfo), checked October 21, 2026.

## Accessibility & privacy

- Stance is never shown by color alone: shapes (▲ for, ● undecided, ▼ against) and labels.
- Color-blind-checked palettes; charts have text alternatives and table views; full keyboard support.
- `prefers-reduced-motion` turns off smooth scrolling, pinning and ambient animation.
- No accounts and no tracking. ZIP codes are looked up on your device. Survey answers are
  anonymous, and written reasons are visible only to the survey's creator.
- The AI report is optional. When used, the decision and its simulated results go to Anthropic.

## Limitations

Ripple simulates reactions from patterns and published polls. It is not a poll of real
people, and it can be wrong. Use it to prepare, to notice who you might be forgetting,
and then to talk to the real people your decision affects. That's what the survey and
the letter are for.
