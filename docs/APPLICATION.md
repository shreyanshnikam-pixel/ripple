# Congressional App Challenge 2026 · application answers for Ripple

Due **today, Monday October 26, 12:00 PM Eastern.** Copy each answer into the form. Words in
**[brackets]** are for you to fill in or check, because they're about you, and only you can say
them truthfully. Every answer is under the 400-word limit.

---

**What is your app called?**
Ripple

**Programming language(s):** ✅ JavaScript ✅ Other → type **TypeScript**
(The app is written in TypeScript, which compiles to JavaScript. Don't tick Python: it was only
used for one-off helper scripts, not the app.)

**Platform(s):** ✅ Web

**Video link:** your YouTube or Vimeo link, set to **Public** and starting with `https://`.

**Project link (optional):** https://shreyanshnikam-pixel.github.io/ripple/
(The code is public at https://github.com/shreyanshnikam-pixel/ripple, which also qualifies you
to opt in to Hack Club's Congressional Certification. Say yes if you'd like to.)

**Cover photo:** `docs/video/cover.jpg` (600×800 JPEG, 3:4, as requested)

---

### Please briefly describe what your app does?

Ripple is a decision simulator for civic life. You type a decision, like "Ban phones during
class" or "Cap yearly rent increases at 5%," and Ripple simulates how 1,000 people would react:
students, parents, teachers, retirees, small business owners and more. You see who supports it,
who opposes it and why, how opinions spread over a year, and a simulated town hall.

Ripple is grounded in real data. When a decision matches a well-studied policy, the simulation
starts from a published poll (Pew Research Center, Gallup, YouGov, PDK and others) and links the
source. Ripple then suggests changes, like a narrower version or a pilot program, and re-runs the
simulation to test them.

It connects to real civic life. Enter a ZIP code and the crowd becomes your congressional
district's real population from U.S. Census data. A local-decisions set covers parks, bond
votes, rent and school start times, and a gallery of 27 real bills in Congress updates weekly
from Congress.gov. Every report says who actually decides and drafts a letter to your
representative that cites only real polls.

Ripple is a rehearsal, not a replacement for people. It turns any question into a 30-second
survey with a QR code, so you can compare real answers with the prediction. Teachers can run it
with a whole class, the whole site works in English and Spanish, and an optional AI report
written by Google Gemini summarizes each simulation.

### What inspired you to create this app?

**[Write this in your own words. It's the answer judges remember most. Some questions to get you
started, so delete these and answer them:]**
- **[Was there a decision at Livingston High School, or in your town, that affected you or people
  you know, where nobody asked students first? What happened?]**
- **[What did you notice about how decisions get made: by school boards, the town council, or
  Congress?]**
- **[Why a simulator? What made you want to "rehearse" a decision before it's made?]**

A true sentence you can use: "While researching, I found that wording changes everything: in a
2024 Pew poll, 68% of adults supported banning phones during class, but only 36% supported
banning them for the whole school day."

### What technical difficulties did you face programming your app?

The hardest problem was making a simulation that is realistic, not just random. Early versions
produced numbers that didn't match reality, so Ripple now starts each decision from a published
poll when one exists, then adjusts for the exact wording. Automated tests check the full
simulation against 40 real polls and require it to land within a few points of each one.

The second challenge was the website itself. The site is hosted for free on GitHub Pages, which
can't run a server. When I tested the published site, Projects and Classes didn't work, because
they had been built to save data on a server. They were rebuilt to save in the browser when no
server is available.

The AI report was the third challenge. Putting an API key in a public website would let anyone
copy it, so a small Cloudflare Worker now holds the key and only accepts Ripple's own simulation
data from Ripple's own site. Google's free Gemini tier is often busy, so the app tries several
models in order. Some networks also dropped requests that took over 30 seconds, so the service
now sends a small "still working" signal every 10 seconds until the report is ready.

**[If you made any of these decisions yourself, or found any of these problems while testing,
say so in your own words.]**

### What improvements would you make if you were to create a 2.0 version of your app?

1. **Test against real elections.** Simulate past local ballot measures, like school bonds and
   tax levies, and compare with the actual results, to measure how accurate Ripple is.
2. **Your town's own crowd.** Today the crowd comes from your congressional district. U.S. Census
   data also exists for cities and school districts, so a city council question could use that
   city's real population.
3. **Spanish voices.** The site and the input work in Spanish, but the simulated people still
   speak English. I'd translate their words and add more languages.
4. **Show uncertainty.** Show a range, like "likely 55–68%," instead of one number, and narrow it
   as real survey answers come in.
5. **A classroom kit.** Short lesson plans tied to civics standards, so teachers can use Ripple
   without designing the activity themselves.

### Did you use AI in the creation, development, or functionality of your app?

**[Check every bracketed item and keep only what's true. Honesty here is what the rules require,
and the form says AI use won't automatically hurt you.]**

Yes. I built Ripple with significant help from AI.

AI tools used:
- **Claude (Anthropic's AI coding assistant)** wrote most of the code under my direction: the
  simulation engine, the website, the server, the tests, and the scripts that record the demo
  video.
- **Google Gemini** powers Ripple's optional AI report, which summarizes each simulation for
  users.

What I did myself:
- I chose the problem: decisions that affect people who were never asked. **[Add your reason.]**
- I directed what Ripple should do and chose the features, including the Spanish version, local
  decisions for my town, classes for teachers, and switching the AI report to free Gemini.
- I tested the app and found problems that needed fixing. For example, Projects and Classes
  didn't work on the published site, and the first version of the video didn't explain the
  problem clearly enough.
- I set up the accounts and published it: GitHub, GitHub Pages and Cloudflare.
- I wrote and recorded the narration for the demo video, and I'm the one presenting it.
- **[Anything you coded, designed or changed yourself.]**

### What did you learn or take away from participating in the Congressional App Challenge?

**[Write this in your own words. Some true things you could build on, so keep only what's true for
you:]**
- **[How much wording changes what people think: 68% vs 36% for nearly the same phone rule.]**
- **[How a website, a server and an AI service fit together, and why you never put a secret key in
  a public website.]**
- **[What using an AI coding assistant taught you: what it was good at, and where you had to test
  and push back.]**
- **[What you learned about how decisions get made in your district and in Congress.]**

---

### About your process

- **Where did you do most of the coding?** **[At Home, unless it was somewhere else.]**
- **Date you completed the coding:** 10/25/2026 (the last code change)
- **Part of a school project or club?** **[No, unless it was.]**
- **Ambassador referral:** leave blank unless someone referred you.
- **Final confirmation:** choose **Yes** only when everything above is filled in. You can't
  change the application after that.
