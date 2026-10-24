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
| **AI report (optional)** | Google Gemini writes a full report from the simulation's data: group by group, risks, recommendations, questions to ask real people, a voice for each group, and answers to follow-up questions. |
| **Take it further** | Who decides this for real (Congress, your state legislature, your city council or school board), related bills, and a starter letter to your representative or state legislator that cites real polls only. |
| **Listen for real** | Turn the question into a 30-second anonymous survey with a QR code, then watch real answers arrive next to Ripple's frozen prediction. |
| **Share** | A link that reproduces the exact result, a 1200×630 image card, and the phone's share menu. |
| **Save to a project** | Keep simulations and surveys together in a project or a class, and see how close the predictions were. |
| **En español** | The whole site has a Spanish version (the **ES** button). Decisions can be typed in Spanish too: Ripple reads them word by word and shows how it read them. |

### Civic tools

| Page | What it does |
| --- | --- |
| **Your district** (`/district`) | Enter a ZIP code (looked up on your device). See your district's Census profile next to the national figures, your representative and senators, and simulate any decision with your district's real population. A **local decisions** set (a park, a school bond vote, a later school start, housing, bike lanes, a solar farm and more) runs your town's questions in one click. |
| **Real bills** (`/bills`) | 27 real bills and laws (stock trading, housing, school safety, daylight saving time, kids' online safety, voting, minimum wage and more), each with a plain-language summary, its progress through Congress, the published poll on the idea, and a one-click simulation. Status updates weekly from Congress.gov. |
| **Projects & classes** (`/projects`) | Save a semester of decisions and surveys, like a student council's. Teachers start a class; students join with a 6-character code and a nickname, and their work rolls up on the teacher's page. No accounts or passwords. On the GitHub Pages site (no server), projects and classes are saved in the browser, and students join on the same device; with the server, they join from their own. |
| **Track record** (`/track-record`) | Every survey with enough answers, predicted vs. real, and how far off Ripple was. Topics with enough real answers nudge future predictions (at most 5 points). |
| **Compare** (`/compare`) | Two wordings, one crowd, and a group-by-group chart of who moves. |
| **Methodology** (`/methodology`) | Every starting point and source, the 32 voices, live realism checks against real polls, and limitations. |

## Run it

Requires Node 22.13 or newer (surveys use Node’s built-in SQLite).

```bash
npm install
npm run dev        # web app on http://localhost:5173, API on http://localhost:8787
```

```bash
npm test           # 166 tests: engine, realism vs. real polls, Spanish, districts, bills, projects, surveys, AI
npm run typecheck  # TypeScript, whole project
npm run build      # production build into dist/
npm start          # serve the built app and the API together on :8787
npm run build:pages  # static site for GitHub Pages (dist-pages/)
npm run build:demo   # single-file preview (dist-artifact/ripple.html)
```

### Turning on the AI report

The AI report is optional and uses Google Gemini through its REST API. A free key from
[Google AI Studio](https://aistudio.google.com/apikey) is enough.

- **On a server:** put `GEMINI_API_KEY=your-key` in a file named `.env` next to `package.json`
  (git ignores it, so the key is never committed), then `npm start` or `npm run dev`. The key
  stays on the server, the server re-runs the simulation itself (so the model only sees
  Ripple's own data), and AI requests have their own rate limit and a daily cap
  (`AI_DAILY_LIMIT`, default 300).
- **Busy models:** the free tier is often busy, so Ripple tries a short list of Gemini models
  in order and moves on when one is busy or retired. Set `GEMINI_MODELS` (comma-separated)
  to choose your own list.
- **On a static site:** visitors can paste their own free Gemini key. It is used straight
  from their browser to Google and kept only for that tab, or on that device if they choose.
  Never put a key in the site's code: anything in a static site is public.

### AI reports for everyone (no key needed by visitors)

A static site can't hold a secret, so a tiny free service on Cloudflare keeps your Gemini key and
writes the reports (`worker/ai.ts`). It only answers Ripple's own site, only accepts Ripple
simulation summaries (it can't be used as a general Gemini proxy), and limits each visitor to
10 requests per 10 minutes and 300 a day. The Pages workflow deploys it for you once these
three repository secrets exist (repository **Settings → Secrets and variables → Actions → New
repository secret**):

| Secret | Where to get it |
| --- | --- |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) (free) |
| `CLOUDFLARE_ACCOUNT_ID` | Free [Cloudflare account](https://dash.cloudflare.com/sign-up). Open **Workers & Pages** once (it asks you to pick a `workers.dev` name), then copy the **Account ID** shown there. |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → **My Profile → API Tokens → Create Token** → template **Edit Cloudflare Workers** → Create. |

Then run **Actions → Deploy to GitHub Pages → Run workflow**. The log prints the service's
address, and the published site uses it automatically. Without the secrets, the site still
works and visitors can paste their own free key.

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
  anchors-topics.ts    housing, school safety, climate and energy (YouGov, PDK, Pew, AEI, NORC)
  gloss.ts             reads decisions typed in Spanish
  local.ts             the local decisions set (parks, bonds, start times, housing…)
  bills.ts             27 verified bills and laws, mapped to the policies they're about
  billStatus.ts        reads Congress.gov bill status (GovInfo BILLSTATUS XML)
  calibration.ts       learns from real survey answers; the public track record
  projects.ts          projects, classes, join codes and the class roll-up
  districts.ts         Census measures → who's in the room, ZIP → district
  civics.ts            who decides, and the starter letter
  ai.ts                grounded context, report schema and Gemini requests
  surveys.ts           tallies and the honest comparison with the prediction
  *.test.ts            166 tests
server/
  index.ts             Express API, validation, rate limits, /api/track-record
  ai.ts                /api/ai: status, report, ask
  surveys.ts           /api/surveys with SQLite (node:sqlite)
  projects.ts          /api/projects: projects, classes, joining, saved work
scripts/build-district-data.ts   builds the district files from public data
scripts/update-bills.ts          refreshes bill status from Congress.gov (weekly GitHub Action)
client/src/
  pages/               Landing, Simulator, District, Bills, Compare, Survey, Projects, Track record, Methodology, About
  i18n/                English and Spanish
  sim/                 Composer, results, AI panel, share sheet, take action, surveys
  components/          Canvas renderers, district picker, QR code, UI pieces
  data/                districts.json and zips.json (generated)
```

**Front end:** React 18, TypeScript, Vite, GSAP ScrollTrigger, Lenis, Framer Motion,
and hand-written Canvas 2D for the ripple field, the crowd and the share card.

**Back end:** Node + Express, input validation, rate limits, SQLite for surveys, and
the Gemini API for the optional AI report. If the server is unreachable, the client
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
| Cap yearly rent increases at 5% | 69% ([YouGov, 2022](https://yougov.com/en-us/articles/43242-housing-policy-yougov-poll-july-19-22-2022)) | within ±8 |
| Rezone for high-density apartment towers | 30% ([YouGov, 2022](https://yougov.com/en-us/articles/43242-housing-policy-yougov-poll-july-19-22-2022)) | within ±8 |
| Put armed police officers in every school | 80% ([PDK Poll, 2022](https://pdkpoll.org/2022-pdk-poll-results/)) | within ±8 |
| Allow teachers to carry guns at school | 50% ([Pew, 2023](https://www.pewresearch.org/politics/2023/06/28/gun-violence-widely-viewed-as-a-major-and-growing-national-problem/)) | within ±8 |
| Prioritize wind and solar over fossil fuels | 57% ([Pew, 2026](https://www.pewresearch.org/science/2026/04/03/americans-shifting-views-on-energy-issues/)) | within ±8 |
| Ban gas stoves | 40% ([YouGov, 2023](https://yougov.com/en-us/daily-results/20230111-063d4-3)) | within ±8 |
| Ban all devices at school | no poll | at most 12–20% support |

The Methodology page runs 40 of these checks live in the browser. `shared/topics.test.ts` covers housing,
school safety, climate and local taxes, and `shared/gloss.test.ts` checks that 19 decisions typed in Spanish
start from the same poll as their English versions.

## Data sources

- **Polls:** Pew Research Center, Gallup, AP-NORC, KFF, YouGov, the PDK Poll, the AEI
  Housing Center with Ipsos, NORC, the University of Maryland's Program for Public
  Consultation, Marist and others. Every source is linked in the app. One solar poll was
  paid for by an advocacy group (GoodPower), and the app says so.
- **Districts:** U.S. Census Bureau, American Community Survey 2024 1-year estimates
  (119th Congress districts), and the 2020 ZIP Code Tabulation Area to district
  relationship file. Rebuild with `npx tsx scripts/build-district-data.ts` after
  downloading the files listed at the top of that script into `data/raw/`.
- **Members of Congress:** [unitedstates/congress-legislators](https://github.com/unitedstates/congress-legislators) (public domain).
- **Bills:** Congress.gov bill status data (via GovInfo). Hand-checked October 21, 2026, then
  refreshed weekly by `.github/workflows/update-bills.yml`, which can only move a bill forward.
- **State and local government:** [Open States](https://openstates.org/) and [USA.gov](https://www.usa.gov/local-governments) links in Take it further.

## Accessibility & privacy

- Stance is never shown by color alone: shapes (▲ for, ● undecided, ▼ against) and labels.
- Color-blind-checked palettes; charts have text alternatives and table views; full keyboard support.
- `prefers-reduced-motion` turns off smooth scrolling, pinning and ambient animation.
- No accounts and no tracking. ZIP codes are looked up on your device. Survey answers are
  anonymous, and written reasons are visible only to the survey's creator.
- Projects open with a private link. Students join classes with a nickname; emails and
  phone numbers are refused so nobody shares them by accident.
- English and Spanish, switchable on every page.
- The AI report is optional. When used, the decision and its simulated results go to Google's Gemini API.

## Limitations

Ripple simulates reactions from patterns and published polls. It is not a poll of real
people, and it can be wrong. Use it to prepare, to notice who you might be forgetting,
and then to talk to the real people your decision affects. That's what the survey and
the letter are for.
