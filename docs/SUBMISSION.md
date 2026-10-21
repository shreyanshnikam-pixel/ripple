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

> **Ripple** helps people make decisions that affect others. You type a decision, like "Ban phones during the
> school day" or "Turn the downtown parking lot into a park", and Ripple simulates how 1,000 people would
> react: parents, students, teachers, small business owners, retirees, and more. You see who supports it, who
> opposes it and why, how opinions spread over a year, and a simulated town hall where the voices respond to each
> other. Ripple then suggests changes, like a narrower version of the rule or a pilot program, and re-runs the
> simulation to show how much each one would help.
>
> Ripple is grounded in reality: when a decision matches a well-studied policy, the simulation starts from published
> polling (Pew Research Center and others) and shows the source. Everything else is clearly labeled as an estimate.
>
> I built Ripple because decisions in my school and community are often made without hearing from the people they
> affect most. Ripple is a rehearsal, not a replacement: every report ends by pointing you to the real people who
> were most opposed, so you can go listen to them.
>
> **Built with:** React, TypeScript, Vite, GSAP, Lenis, Framer Motion, Canvas, Node.js, Express. The simulation
> engine is written from scratch: it reads a decision, finds the closest of about 50 well-known policies, starts from
> real polling where it exists, lets 32 personas weigh the decision by their values and their own stake, and uses an
> opinion-dynamics model so 1,000 agents influence their neighbors over time. Automated tests check it against real polls.

## Demo video script (about 2:45)

| Time | Show on screen | Say |
| --- | --- | --- |
| 0:00–0:15 | Landing page hero, move the mouse so the ripples follow | "Hi, I'm ___ from ___, and this is Ripple. Every decision makes waves, and Ripple lets you see them before you decide." |
| 0:15–0:35 | Scroll slowly through the problem statement and "How it works" | "When a school or a town makes a decision, the people most affected often never get asked. I wanted a tool that helps you think about everyone in the room." |
| 0:35–0:55 | Scroll into "Watch it ripple" so the crowd moves from Day 1 to Year 1 | "Each dot is one simulated person. As you scroll, a year passes. People talk to their neighbors, and opinions shift." |
| 0:55–1:25 | Open the simulator, type "Raise the local sales tax by 1% to fund a new library", point at the live topic tags, press Simulate | "I'll try a real kind of decision. As I type, Ripple shows what it understood. Then it simulates 1,000 residents." |
| 1:25–1:55 | Verdict, then the crowd: press "Play the year" and hover "Fiscal watchdogs" | "It leans toward support. Healthcare workers and advocates are for it, while fiscal watchdogs and retirees push back. I can highlight any group in the crowd and watch a year go by." |
| 1:55–2:15 | Voices cards, then the town hall playing | "Here's what each group would say, and a simulated town hall where they actually argue with each other." |
| 2:15–2:35 | Type "Ban all devices at school", show the Reality check, then click "Try this version" on "Narrow it to phones during class" | "Results are grounded in real polls. Banning every device gets about 12% support. Ripple suggests a narrower version, phones during class only, which Pew found 68% of adults support, and re-runs it." |
| 2:35–2:45 | Method section and disclaimer | "Ripple always shows its work, and reminds you these are simulations. Use it to prepare, then go talk to real people. Thank you!" |

Tips: record at 1920×1080 with the browser zoomed to about 110%, close other tabs, and run `npm run build && npm start`
for the smoothest animations.

## How Ripple lines up with what judges look for

- **Civic impact:** it is built for student councils, city councils, families, and small businesses, and it
  pushes users to listen to real people.
- **Technical depth:** a custom simulation engine (topic analysis, ~50 policy anchors, poll calibration, persona
  self-interest, agent-based opinion dynamics, tested fixes), a typed API shared by server and client, 32 automated
  tests including realism checks against Pew and other polls, and an offline fallback.
- **Realism you can verify:** every report shows its starting point and links to the poll it came from.
- **Design:** a distinct visual identity, scroll-driven storytelling, and data visualizations that follow
  accessibility rules (color-blind-safe palette, shapes and labels on top of color, table views, reduced motion).
- **Responsibility:** transparency about how results are produced, clear limitations, and no data collection.

## Checklist before you submit

- [ ] Run `npm install && npm run dev` on your own computer and try several decisions.
- [ ] Change anything you want in your own style, and make sure you can explain all of it.
- [ ] Push the code to a public GitHub repository and add the link to your submission.
- [ ] Record and upload the demo video (public, under 3 minutes).
- [ ] Fill in the form on your district's page before the deadline.
