# Ripple: see the reaction before you decide

**Ripple** is a decision simulator. You type a decision you are weighing, like
*"Ban phones during the school day"* or *"I'm thinking about quitting my job to
start a bakery."* Ripple builds a crowd of 1,000 simulated people, from parents and
students to shop owners and retirees, and shows how they would react, argue, and
change their minds over a year.

It is built for the moments when a decision lands on other people: student
councils, city councils, families, and small businesses.

## What it does

| Feature | What you see |
| --- | --- |
| **Live reading** | As you type, Ripple shows the topics it detects, which setting the decision belongs to, and how much detail it can work with. |
| **The verdict** | Net support, a for/undecided/against split, polarization, backlash risk, and a simulation margin, written in polling language. |
| **The crowd** | 1,000 dots, one per simulated person. Press play to watch opinions spread from Day 1 to Year 1. Hover a group to see where its people are. |
| **The voices** | One representative per group, in their own words, with what moved them and what would change their mind. |
| **Crosstabs** | A diverging bar chart of support by group, with a table view for screen readers and exact numbers. |
| **Over time** | A line chart of support and opposition across four moments, plus the themes driving the conversation. |
| **Town hall** | A simulated forum (or dinner table, or all-hands) where the voices respond to each other. |
| **Reality check** | Where the numbers came from: a published poll when your decision matches one (with a link), or a labeled estimate, plus every adjustment for your wording. |
| **Who's in the room** | Change the crowd: a college town vs. a retirement community, a student vote vs. a staff meeting. Same decision, different room, different result. |
| **Fixes** | Narrower versions ("ban phones during class only") and add-ons ("start with a pilot"), each tested by re-running the simulation. One click applies it and shows before → after. |
| **Method** | Exactly which words Ripple matched and how they moved each value. No black box. |

32 voices across four settings: **personal** (Mom, best friend, mentor, Future You…),
**school** (freshman, teacher, principal, working student…), **community** (working
parent, retiree, small business owner, nurse…), and **business** (loyal customer,
frontline staff, investor, neighbor…).

## Run it

Requires Node 18 or newer.

```bash
npm install
npm run dev        # web app on http://localhost:5173, API on http://localhost:8787
```

Other scripts:

```bash
npm test           # engine and realism tests
npm run typecheck  # TypeScript, whole project
npm run build      # production build into dist/
npm start          # serve the built app and the API together on :8787
npm run build:demo # single-file demo (dist-artifact/ripple.html) that runs offline
```

## How it's built

```
shared/            The simulation engine, shared by server and browser
  engine.ts          analyze → starting point → score → calibrate → crowd → report
  anchors.ts         ~50 well-known decisions: poll or estimate, stakes by role, voice lines
  personas.ts        32 voices: values, roles, change aversion, and voice lines
  lexicon.ts         topic and mitigation keywords and their value impacts
  types.ts           the API contract (SimulationResult)
  engine.test.ts     unit tests
  realism.test.ts    checks against real polls and common sense
server/index.ts    Express API: /api/simulate, /api/analyze, /api/health
client/src/
  pages/             Landing (scroll story) and Simulator (the lab)
  sections/          Landing sections: hero, statement, how it works, crowd, voices…
  sim/               Simulator UI: composer, verdict, crowd, charts, town hall, fixes
  components/        Canvas renderers (ripple field, crowd) and UI pieces
  lib/               API client with offline fallback, smooth scroll, history
```

**Front end:** React 18, TypeScript, Vite, GSAP ScrollTrigger (pinned and scrubbed
sections), Lenis (smooth scrolling), Framer Motion (reveals, layout animation),
and hand-written Canvas 2D for the ripple field and the crowd.

**Back end:** Node + Express with input validation and a simple rate limit. If the
server is unreachable, the client runs the same engine in the browser, so the app
also works offline and as a static page.

### The simulation engine (v2)

1. **Read the decision.** Topics (taxes, schedules, phones, housing…), mitigations
   (pilot, opt-out, financial aid, input, training, safeguards), all-or-nothing
   wording ("all", "forever"), whether it *lifts* a rule ("lift the ban on…"),
   the setting, and the closest of ~50 well-known kinds of decisions ("anchors").
2. **Start from reality.** If an anchor matches, Ripple starts from its support
   level: a published poll for 10 of them, a labeled estimate for the rest. If none
   matches, it uses its own model. Then it adjusts for wording: all-or-nothing
   language lowers support, pilots and opt-outs raise it.
3. **Score each voice.** Each persona weighs the decision by its values *and* its
   own stake as a student, parent, teacher, business owner, retiree and so on.
4. **Calibrate.** Everyone is shifted by the same amount so that day-one support
   in the poll's population (for example, adults) matches the starting point.
   Differences between groups stay intact, so students can still oppose a phone
   ban that most adults support.
5. **Crowd.** 1,000 agents are placed in neighborhoods. Over four time steps each
   agent drifts toward what their neighbors think (bounded-confidence opinion
   dynamics), the shock of change fades, and on divisive topics views harden.
6. **Report.** Crosstabs, quotes in each persona's own words, a town hall, and
   fixes scored by re-running the model with the fix applied.

### Realism tests

`shared/realism.test.ts` checks the engine against real polls and common sense,
for example:

| Decision | Real poll | Test |
| --- | --- | --- |
| Ban phones during class | 68% of adults ([Pew, 2024](https://www.pewresearch.org/short-reads/2024/10/14/most-americans-back-cellphone-bans-during-class-but-fewer-support-all-day-restrictions/)) | within ±7 |
| Ban phones for the entire school day | 36% of adults (Pew, 2024) | within ±7 |
| Ban TikTok | 34% ([Pew, 2025](https://www.pewresearch.org/short-reads/2025/03/25/fewer-americans-now-support-tiktok-ban-see-the-platform-as-a-national-security-threat-than-in-spring-2023/)) | within ±8 |
| $15 minimum wage | 62% ([Pew, 2021](https://www.pewresearch.org/short-reads/2021/04/22/most-americans-support-a-15-federal-minimum-wage/)) | within ±8 |
| Phase out gas cars by 2035 | 40% ([Pew, 2023](https://www.pewresearch.org/short-reads/2023/07/13/how-americans-view-electric-vehicles/)) | within ±8 |
| Parental consent for teen social media | 81% of adults ([Pew, 2023](https://www.pewresearch.org/short-reads/2023/10/31/81-of-us-adults-versus-46-of-teens-favor-parental-consent-for-minors-to-use-social-media/)) | within ±7 |
| Free school lunch for all students | 60% ([YouGov, 2023](https://www.chalkbeat.org/2023/9/7/23863415/polls-support-universal-free-school-meals-breakfast-lunch-students)) | within ±8 |
| Ban all devices | no poll | at most 12–20% support |
| Cancel summer break / cancel prom | no poll | at most 15% / 25% |

Other sources used as starting points: EdChoice (four-day school week, 2023),
C.S. Mott Children's Hospital National Poll (later start times, 2015), Ipsos
(four-day work week, 2021) and AP-NORC (clock changes, 2019). Because these polls
set the starting point, matching them is partly by design. The tests make sure the
full simulation (crowd, social spread, group mix) still lands near them, and that
wording changes move results in the right direction.

Results are deterministic: the same decision always gives the same report, which
makes it testable and fair to compare fixes.

The engine sits behind a small interface in `server/index.ts`, so a language-model
engine can be added later to write richer quotes while keeping the crowd model.

## Accessibility & privacy

- Stance is never shown by color alone: every stance has a shape (▲ for, ● undecided, ▼ against) and a label.
- Support and opposition use a blue/orange pair checked for color-blind separation.
- Charts have text alternatives and a table view. Everything works with a keyboard.
- `prefers-reduced-motion` turns off smooth scrolling, pinning, and ambient animation.
- No accounts and no tracking. Recent decisions are saved only in your browser.

## Limitations

Ripple simulates reactions from patterns. It is not a poll of real people, and it
can be wrong. Use it to prepare questions and to notice who you might be
forgetting, then talk to the real people your decision affects.
