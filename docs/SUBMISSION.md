# Congressional App Challenge submission guide

## Key dates and rules (verify on the official site)

- **Deadline:** most House offices list **Monday, October 26, 2026, 12:00 PM ET**. At least one office lists
  October 30. Check your own district's page and https://www.congressionalappchallenge.us before relying on either.
- **Demo video:** 1–3 minutes, posted publicly on YouTube or Vimeo. Videos over 3 minutes may be penalized.
  Say your name(s), the app's name, and its purpose.
- **Eligibility:** middle or high school students, competing in the district where you live *or* go to school.
  Teams of up to 4.
- **New work:** apps must be created after October 30, 2025.
- Judges may ask follow-up questions, so know how every part works. Read `README.md` and
  `shared/engine.ts` until you can explain the simulation in your own words. If your district's rules ask about
  tools or help you used, answer honestly.

## App description (paste into the form, then edit in your own voice)

> **Ripple** helps people make decisions that affect others. You type a decision, like "Ban phones during
> class" or "Ban members of Congress from trading stocks", and Ripple simulates how 1,000 people would react:
> parents, students, teachers, small business owners, retirees and more. You see who supports it, who opposes
> it and why, how opinions spread over a year, and a simulated town hall where the voices answer each other.
> Ripple suggests changes, like a narrower version or a pilot, and re-runs the simulation to show how much each
> one would help.
>
> Ripple is grounded in reality. When a decision matches a well-studied policy, the simulation starts from
> published polling (Pew Research Center, Gallup, AP-NORC, KFF, YouGov, PDK and others) and links the source,
> including the issues districts raise most: housing, school safety and climate. Enter your ZIP code and Ripple
> fills the crowd with your congressional district's real population from U.S. Census data, shows who represents
> you, and offers a set of local decisions (a park, a school bond vote, a later school start) to run with your
> neighbors. A gallery of 27 real bills and laws from Congress, updated weekly from Congress.gov, lets you
> simulate the public reaction to each one.
>
> Ripple is a rehearsal, not a replacement. Every report says who really decides, drafts a letter to your
> representative that cites real polls (never simulated numbers), and can turn the question into a 30-second
> anonymous survey with a QR code, so you can compare real answers with the prediction. Those real answers
> feed a public track record and gently correct future predictions. Teachers can run Ripple with a whole class:
> students join with a code and a nickname, and their simulations and surveys roll up in one place. The whole
> site works in English and Spanish, and Ripple reads decisions typed in either language. An optional AI report,
> written by Claude from the simulation's data, adds recommendations and questions to ask real people.
>
> **Built with:** React, TypeScript, Vite, GSAP, Lenis, Framer Motion, Canvas, Node.js, Express, SQLite, U.S.
> Census data, and the Anthropic API. The simulation engine is written from scratch: it reads a decision, starts
> from real polling where it exists, lets 32 personas weigh the decision by their values and their own stake,
> and uses an opinion-dynamics model so 1,000 agents influence their neighbors over time. 166 automated tests
> check it, including 40 checks against real polls.

## The ready-made demo video

`ripple-demo.mp4` (2:54, 1920×1080, 60 fps) is a captioned walkthrough of the real app: the simulator,
fixes, the crowd and voices, your district and local decisions, a real housing law, a survey, a class, the
Spanish version and the realism checks. To finish it:

1. Record your voice over it with `docs/video/narration.md`, a script timed to the video: the problem, how
   Ripple fixes it, then the demo. It opens with your name and school. Free editors such as CapCut, iMovie or Clipchamp can add a voice track.
2. Upload it to YouTube as **Public** (or Vimeo), with `docs/video/thumbnail.png` as the thumbnail. The captions are
   already in the video; `docs/video/captions.srt` is there if you want closed captions too.
3. To put your name on the title and end cards, or to re-record after changing the app:
   `npm run build && npm start`, then in another terminal
   `NAME="Your Name" SCHOOL="Your School" ZIP="your ZIP" BASE_URL=http://localhost:8787 node scripts/video/record-demo.mjs`
   (needs `npm i -D playwright && npx playwright install chromium`, and ffmpeg).

The survey answers and the two students in the class are samples submitted by the recording script, and the
video says so on screen ("demo answers", "demo students").

The recorder saves 30 fps. For the smoother 60 fps version, run
`ffmpeg -i ripple-demo.mp4 -vf "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" -crf 17 ripple-demo-60.mp4`
(slow: split the file into parts to use several cores).

## Demo video script (about 2:55, if you'd rather record your own)

| Time | Show on screen | Say |
| --- | --- | --- |
| 0:00–0:15 | Landing page hero, move the mouse so the ripples follow | "Hi, I'm ___ from ___, and this is Ripple. Every decision makes waves, and Ripple lets you see them before you decide." |
| 0:15–0:30 | Scroll through the statement and "Watch it ripple" | "Decisions often get made without hearing from the people they affect. Each dot is one simulated person, and as I scroll, a year passes." |
| 0:30–1:00 | Simulator: type "Ban all devices at school", show the Reality check, then click "Try this version" on "Narrow it to phones during class" | "Ripple is grounded in real polls. Banning every device gets very little support. A narrower version, phones during class, starts from a Pew poll where 68% of adults agree, and Ripple re-runs it." |
| 1:00–1:20 | Crowd "Play the year", then Voices and the town hall | "I can watch opinions spread, hear what each group would say, and see them argue in a simulated forum." |
| 1:20–1:45 | Your district: enter your ZIP, show the profile and your representative, click a suggested decision | "Ripple can also fill the room with my own congressional district's real population from Census data, and it shows who represents me." |
| 1:45–2:10 | Real bills: filter "Passed a chamber", open the Stop Insider Trading Act, Simulate reactions, scroll to Take it further | "These are real bills from Congress. I can simulate the reaction, see who decides, and get a starter letter to my representative that cites real polls and names the bill." |
| 2:10–2:35 | "Ask the real people": create a survey, show the QR code, open results with a few answers | "Ripple is a rehearsal. I can send a 30-second survey and compare real answers with the prediction, group by group." |
| 2:35–2:50 | Compare page with "Phones at school" (or the AI report, if a key is set up) | "I can compare two wordings with the same crowd, or have Claude write a full report." |
| 2:50–2:55 | Methodology page | "Every number shows its source. Use Ripple to prepare, then go listen. Thank you!" |

Tips: record at 1920×1080 with the browser zoomed to about 110%, close other tabs, and run `npm run build && npm start`
for the smoothest animations. For the AI report in the video, set `ANTHROPIC_API_KEY` first.

## How Ripple lines up with what judges look for

- **Civic impact:** built for student councils, city councils, families, small businesses and Congress. It
  connects each decision to the people who make it for real (your representative, your state legislature, your
  council or school board) and pushes users to listen to real people with surveys. Classes can use it together.
- **Access:** a full Spanish version, with Spanish input, for the 40+ million Americans who speak Spanish at home.
- **Technical depth:** a custom simulation engine (topic analysis, poll anchors, calibration, persona
  self-interest, agent-based opinion dynamics), a Census data pipeline for 437 districts and 33,000 ZIP codes,
  a bills dataset that updates itself from Congress.gov, a SQLite service for surveys, projects and classes,
  calibration from real survey answers, a Spanish reading layer, an optional AI layer with structured outputs,
  and 166 automated tests including 40 realism checks against real polls.
- **Realism you can verify:** every report shows its starting point and links to the poll; every bill links to
  Congress.gov; the Methodology page runs the realism checks live; the Track record page shows how close
  predictions came to real survey answers.
- **Design:** a distinct visual identity, scroll-driven storytelling, accessible data visualizations
  (color-blind-safe palettes, shapes and labels on top of color, table views, reduced motion).
- **Responsibility:** simulated numbers are never presented as real results; letters cite real polls only;
  ZIP lookups stay on the device; survey answers are anonymous; AI is optional and grounded.

## Checklist before you submit

- [ ] Run `npm install && npm run dev` on your own computer and try several decisions.
- [ ] Change anything you want in your own style, and make sure you can explain all of it.
- [x] Name, school and district are in `client/src/content/team.ts`. Add your `story` (a sentence or two, in your own words).
- [ ] Push the code to a public GitHub repository, turn on GitHub Pages (see README), and add both links to your submission.
- [ ] Record and upload the demo video (public, under 3 minutes).
- [ ] Fill in the form on your district's page before the deadline.
