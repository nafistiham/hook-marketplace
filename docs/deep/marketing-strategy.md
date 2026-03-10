# Hook Marketplace — GTM and Marketing Strategy

**Audience:** Founder, Month 0–12
**Date:** 2026-03-10

---

## The One-Sentence Strategy

Be the definitive answer to "how do I do X with Claude Code hooks?" on every channel where developers search — before a competitor decides the same thing matters.

This is not a paid acquisition strategy. It is not a brand campaign. It is a technical content and community strategy built around one insight: developers with Claude Code hook problems are actively searching for answers right now, and nothing authoritative exists to answer them. The marketplace fills that vacuum by being found, not by interrupting.

---

## Part 1: The Core Growth Engine — Be The Answer

### The Problem With Existing Discovery

The current state of Claude Code hook discovery is copy-paste from a GitHub repo you found via a Show HN post. `hesreallyhim/awesome-claude-code` (21.6k stars) is the closest thing to a directory, but it is a hyperlink list, not a searchable, installable registry. `karanb192/claude-code-hooks` is a great repo to find if you find it — but it relies on the user already knowing it exists.

The practical result: every Claude Code user who wants to block dangerous commands writes their own `bash-guard.sh` from scratch, or finds a blog post from three months ago that references a repo that might not be maintained. This is the gap. The marketplace closes it.

### What "Being The Answer" Means, Channel by Channel

**Search (the highest-leverage channel)**

When a developer types "Claude Code auto format python" into Google, the correct answer is a landing page at `hookpm.dev/hooks/auto-format-python` that shows: what the hook does, what events it hooks, an install count, a one-line install command, and the exact change it makes to `settings.json`. That page ranks because it is the most specific, most useful, most linkable answer to that query. No blog post from a solo developer is more authoritative than a maintained registry page with install metrics.

When a developer types "Claude Code block rm -rf", the answer is `hookpm.dev/hooks/bash-guard`. When they type "Claude Code hook prompt injection", the answer is `hookpm.dev/hooks/prompt-injection-scanner`. Each hook is its own SEO unit. 1,000 hooks is 1,000 indexed pages targeting 1,000 long-tail queries from developers who are already sold on the solution — they just need to find it.

**Hacker News (the launch and authority channel)**

HN is where Claude Code power users congregate. The threads "Claude Code now supports hooks" and "Claude Hooks: 6 hooks to make Claude Code cleaner, safer, saner" each generated substantive technical discussion. HN does not convert browsers into users — it converts power users into champions. A well-received Show HN post leads to GitHub stars, which leads to credibility, which leads to organic inbound from every other channel. HN is the launch vehicle because the audience is self-selecting: developers who are on Hacker News and care about Claude Code hooks are exactly the early adopters the marketplace needs.

**Reddit / Forums (the search-capture channel)**

The research found no significant Reddit community for Claude Code hooks yet — which is the opportunity, not the problem. When a developer posts "how do I prevent Claude Code from running dangerous commands?", the answer should be posted from the marketplace's account with a link to the specific hook. This is not spam — it is the accurate, complete answer to the question. Do this consistently across r/ClaudeAI, r/LocalLLaMA, r/programming threads where hooks come up. Over time, "the hookpm person always has a good answer" becomes a reputation.

**Existing HN threads to answer now (not wait for new ones):**
- Any HN thread mentioning Claude Code security or hooks — search `hn.algolia.com` for "claude code hooks" and reply to threads that are still active
- The Check Point Research CVE threads — this is where security engineers are already reading about hook risks; the marketplace's answer is "here is the reviewed alternative"

---

## Part 2: The 1,000 Hooks SEO Flywheel

### Why Volume Matters Here (and Only Here)

Volume-as-strategy fails in most developer tool contexts because it produces junk. npm has 2 million packages and is functionally unusable without curated discovery layers. GitHub Actions Marketplace found that 65% of new actions duplicated existing tools within six months.

The hook marketplace escapes this trap because hooks have a different structure than packages. A hook is a small, scoped behavior: it fires on a specific event, does one thing, exits. There is a natural ceiling on meaningful variation — "block dangerous commands" does not need 47 versions. The catalog grows to depth (more hook categories, more language-specific formatters, more observability patterns) rather than to width (17 slightly different bash-guards with different regex patterns).

The right model is VS Code extensions: the marketplace has 55,000+ extensions, but the discoverability infrastructure (categories, search, install counts, ratings) means developers can find exactly what they need. Every extension has its own page. Every page is indexed. The long tail of "VS Code extension for X" search queries is answered by extension landing pages, not by blog posts.

### The Flywheel Mechanics

The compounding loop works like this:

1. **More hooks → more landing pages.** Every hook added to the registry gets a dedicated page at `hookpm.dev/hooks/<hook-name>`. This page is the SEO unit — it targets the specific search query for that use case.

2. **More pages → more organic search traffic.** Each page ranks for its specific long-tail query. The aggregate effect of 1,000 hook pages is meaningful search surface area by year 2. Individual pages rank within weeks of indexing because developer-tool queries have low competition and high specificity.

3. **More search traffic → more CLI installs.** Developers who find a specific hook page install the CLI to get that hook. The CLI then shows them other hooks they did not know they wanted. Discovery compounds within the product.

4. **More CLI installs → more hook authors.** Developers who install and use the CLI start writing their own hooks. Some of them contribute back. The contributor-to-user ratio for developer tools is typically 1–3% — at 10,000 installs, that is 100–300 potential contributors.

5. **More contributors → more hooks.** The catalog grows without the founder writing every hook.

6. Repeat from step 1.

### Hook Page Structure (What Makes These Pages Rank)

Every hook landing page needs these elements:

- **Hook name and one-line description** — "block-dangerous-commands: Prevents Claude Code from running destructive shell commands like `rm -rf`, fork bombs, and pipe-to-shell patterns"
- **Install command** — prominent, copyable: `hookpm install block-dangerous-commands`
- **Hook event and behavior** — "Fires on `PreToolUse` for Bash tool calls. Exits with code 2 (block) if the command matches dangerous patterns. Returns a message Claude can read explaining why it was blocked."
- **Settings.json diff** — the exact JSON block the CLI adds, shown before/after
- **Install count and last-updated date** — social proof and freshness signals
- **Verification status** — unverified / verified / certified (see security section)
- **Related hooks** — cross-links to other hooks in the same category
- **Contributing link** — how to report issues or suggest improvements

The URL structure is flat and human-readable: `hookpm.dev/hooks/block-dangerous-commands`, `hookpm.dev/hooks/auto-format-python`, `hookpm.dev/hooks/tdd-guard`. These URLs are the anchors of the SEO strategy. They must exist before the marketing begins — content that links to a hook should link to the hook's canonical page, not to a GitHub README.

### Category Pages as SEO Hubs

Above the individual hook pages are category pages that capture broader queries:

- `hookpm.dev/hooks/security` — "Claude Code security hooks" — lists all security-category hooks
- `hookpm.dev/hooks/formatting` — "Claude Code auto format hooks"
- `hookpm.dev/hooks/testing` — "Claude Code testing hooks TDD"
- `hookpm.dev/hooks/observability` — "Claude Code logging monitoring hooks"
- `hookpm.dev/hooks/notifications` — "Claude Code desktop notifications hooks"

These pages rank for the broader category queries and funnel users to specific hook pages. They also serve as the "browse" experience for users who do not know exactly what they want.

### What Makes This Different From The awesome-claude-code List

`hesreallyhim/awesome-claude-code` is a hyperlink directory. It has no install mechanism, no search, no individual pages per hook, no install counts, no verification status. When GitHub indexes it, it indexes one page — the README — which competes for exactly one search query ("awesome claude code"). The marketplace's 1,000 hook pages compete for 1,000 queries. This is not a marginal SEO advantage; it is a structural one.

---

## Part 3: Launch Strategy

### Week 1 Launch

**The 10 hooks to build before anything else:**

These are not arbitrary — they cover the use cases of approximately 80% of Claude Code power users, based on what the community is actually building right now:

| Hook | Category | Why First |
|---|---|---|
| `bash-guard` | security | Most-requested hook across every community thread |
| `file-protect` | security | `.env` and credentials protection — obvious value |
| `auto-format-python` | quality | Python is the dominant Claude Code user language |
| `auto-format-js` | quality | JavaScript/TypeScript is second |
| `notify-desktop` | workflow | Task completion notification — universal UX improvement |
| `git-auto-stage` | workflow | Saves a step every single session |
| `tdd-guard` | testing | `tdd-guard` repo has HN traction — validated demand |
| `event-logger` | observability | Needed for debugging and auditing hook behavior itself |
| `session-bootstrap` | context | Injects project context on start — solves CLAUDE.md drift |
| `prompt-injection-scanner` | security | High-value, differentiated from what anyone else ships |

Each hook ships with: a `hook.json` manifest, a tested script, a 5-line README, and its dedicated landing page. Do not launch until all 10 are tested against real Claude Code hook event payloads.

**The Show HN post:**

Post title: `Show HN: hookpm – a package manager for Claude Code hooks`

Do not use a clever title. HN Show HN posts succeed when they are accurate and specific about what they built. The body should be approximately 300 words covering:

1. The problem: Claude Code hooks are powerful, but installing them is manual copy-paste from GitHub repos. There is no package manager, no discoverability, no security review.
2. The security angle (one paragraph): hooks auto-execute on your machine. A malicious hook in a shared repo is remote code execution. The CVEs are real (cite CVE-2025-59536 and CVE-2026-21852 specifically). The marketplace's capability declaration model is the answer.
3. The demo: `curl -fsSL https://hookpm.dev/install.sh | bash && hookpm install bash-guard` — that is the whole demo. Show the `settings.json` diff.
4. The current state: 10 hooks, open registry, PRs welcome.

Post time: Tuesday or Wednesday morning, 8–10 AM US Eastern. This is when HN Show HN posts get the most front-page time before being pushed down.

**Discord and community channels — the same day as the HN post:**

Post in the Claude Code official Discord (the `#tools-and-integrations` or equivalent channel). The post is a one-paragraph version of the Show HN body with a link to the HN thread — this drives early upvotes and comments back to HN, which is the most important signal in the first two hours.

Also post in any active Claude Code Slack communities and the Anthropic developer community channels if accessible.

**DM targets — the day before the Show HN post:**

These are not cold DMs. They are "I built something you might want to know about" messages to people who have already demonstrated interest in this exact space:

- Maintainer of `hesreallyhim/awesome-claude-code` — ask if they would add the marketplace to their hooks section. They are likely to say yes; it is a genuine value-add for their list.
- Maintainer of `karanb192/claude-code-hooks` — offer to list their hooks in the registry with full attribution. This is not competition; it is aggregation.
- `disler` (disler/claude-code-hooks-mastery, disler/claude-code-hooks-multi-agent-observability) — same offer.
- `johnlindquist` (claude-hooks, TypeScript hook framework) — their framework is complementary; co-promotion is natural.

The ask in each DM is minimal: "I'm launching tomorrow, would you take a look?" People who have already invested in this space are predisposed to support adjacent efforts that do not compete with them.

**Week 1 success criteria:**

- 500 GitHub stars on the registry repo
- 100 `hookpm install` runs (tracked via download counter in the CLI)
- 20 contributors expressing interest (GitHub issues, Discord messages, PRs)
- HN post: at least 100 upvotes and 20+ comments asking for specific hooks (the comments are the real signal — they are a free research backlog)

### Month 1 Follow-Up

**The security blog post:**

Title: `The two CVEs that make shared Claude Code hooks dangerous (and how to fix it)`

Publish on the marketplace blog (not Medium or DEV Community first — canonical URL must be owned). Then cross-post to DEV Community, Hashnode, and submit to HN as a regular Ask/Tell HN post (not Show HN — this is editorial content, not a product launch).

The post structure:

1. What hooks are and why they execute code on your machine
2. CVE-2025-59536 and CVE-2026-21852 — what actually happened, responsible disclosure summary
3. Why the attack surface is structural: any repo with `hooks` in `settings.json` can execute arbitrary code when a developer runs Claude Code in that directory
4. The marketplace's response: capability declarations, security review checklist, verified badge
5. Call to action: install the CLI and use reviewed hooks instead of copy-paste scripts from untrusted repos

This post does two things simultaneously: it is genuine security education (and will spread in security communities, AppSec Slack groups, OWASP channels), and it is the product story told through a problem-first lens. Security is the moat. This post makes that concrete.

**Why this content travels:**

Security researchers share responsible disclosure write-ups. Developer news aggregators (TLDR.tech, Hacker Newsletter, Cooper Press newsletters) pick up CVE-related developer tooling content. Anthropic's security team may amplify it. The post will reach audiences that have never heard of Claude Code hooks and come away understanding both the risk and the solution in one read.

---

## Part 4: Community Strategy

### Open Everything

The registry spec, the hook.json schema, the CLI source, the review checklist, the contributor guide — all of it is public on GitHub from day one. There is no proprietary component in Phase 1 except the verified badge (which is a process, not software).

Open source serves multiple goals here. It makes the security claims credible (you cannot claim a transparent review process on closed-source infrastructure). It drives organic GitHub stars. It allows contributors to submit hooks via PR without needing any account or platform beyond GitHub. And it means that if the marketplace becomes the standard, the standard is owned by the community, not by a single company — which is what makes it sustainable.

### PR-Based Hook Submission

The submission flow is intentionally simple: fork the registry repo, add a `hooks/<hook-name>/` directory with a `hook.json` and the hook script, open a PR. The `CONTRIBUTING.md` defines the required fields and the automated checks that run on submission (static analysis, capability declaration validation, README presence check).

This mirrors how VS Code Extension submissions work in spirit, but is lower friction because it uses GitHub's existing PR workflow rather than a separate portal. Contributors already know how to open a PR. The barrier is the hook itself, not the submission mechanics.

### Hook Author Spotlight

Every month, publish one "Hook Author Spotlight" — a short blog post or Twitter/X thread profiling the person who contributed a notable hook. The format is: who they are, what problem prompted the hook, what the hook actually does, and how to install it. Tag them, link to their GitHub.

This has two effects. It incentivizes contribution (contributors get public recognition and a backlink to their GitHub profile). And it generates a steady stream of authentic, technical content that showcases what the community is building — which is more compelling than anything the founder could write about the marketplace itself.

The spotlight posts should be cross-posted as Twitter/X threads. A thread structured as "Meet @username — they built the hook that does X. Here's how it works:" is the kind of content that gets retweeted in the Claude Code developer community. Anthropic's developer relations team and Claude Code engineering team members are active on Twitter/X and notice community activity.

### Discord / Slack Community

Create a Discord server for hook authors (not a general Claude Code server — that already exists). The purpose is specific: a place where people who are building hooks talk to each other about hook development, review each other's hooks, and discuss patterns.

Keep the channel count minimal at launch: `#general`, `#submissions`, `#security-review`, `#show-your-hook`. The goal is not a large community — it is a concentrated, high-quality community of people who are actively building in this space. 200 engaged hook authors is more valuable than 2,000 passive members.

### Monthly Hook of the Month

Each month, designate one hook as "Hook of the Month" — selected based on install count growth, community votes in Discord, or editorial selection by the founder. The hook gets: a prominent placement on the website homepage, a blog post, a Twitter/X thread, and a mention in any newsletter or digest the marketplace sends.

This creates a recurring content moment that gives authors something to aim for and gives the community a shared focal point. It also ensures the marketplace homepage is not static — it changes monthly, which is both a freshness signal for SEO and a reason for returning visitors to come back.

---

## Part 5: Channel Priority

These channels are ranked in order of expected return per hour of effort in the first 12 months.

### 1. Hacker News

**Why it is first:** The Claude Code developer audience on HN is self-selected to be power users. The threads that have already appeared around hooks (Show HN posts, CVE discussions, TDD-through-hooks) demonstrate that this community engages substantively with hook content. A well-received HN post has a multiplier effect: it generates GitHub stars, triggers coverage in developer newsletters, and establishes credibility that all other channels inherit.

**What to post and when:**
- Week 1: `Show HN: hookpm – a package manager for Claude Code hooks`
- Month 1: Submit the security CVE blog post as a regular HN link (this is editorial content, not a product launch — it will not get flagged as promotional)
- Month 3: `Show HN: hookpm now has 100 hooks` — frame this around the community growth and what hooks the community built, not around the product
- Month 6: `Ask HN: What Claude Code hooks do you wish existed?` — this generates both SEO content ideas and community engagement

Do not post Show HN more than once per quarter. HN will start to ignore repeated self-promotion. Space out posts and make each one genuinely new.

### 2. GitHub

**Why it is second:** GitHub stars are the credibility signal for developer tools. When a developer evaluates whether to trust a registry, the first thing they check is the star count on the primary repo. 500 stars is meaningful. 2,000 stars is credible. 5,000 stars makes the marketplace a reference point in its category.

The star count also has a compounding property: GitHub's trending repos surfacing algorithm rewards velocity. A burst of stars (from a successful HN post) can land the registry on GitHub Trending, which generates a second wave of organic discovery.

**What to do on GitHub:**
- Maintain the registry repo actively — PRs reviewed within 48 hours, issues triaged within 72 hours
- Use GitHub Releases for CLI version updates — release notes are indexed and generate notification emails to watchers
- Submit to `awesome-claude-code` (pending approval from the maintainer DM) — a link from a 21.6k-star repo is a meaningful signal to GitHub's internal relevance systems
- Open issues with clear "good first issue" labels to drive contribution

### 3. DEV Community and Hashnode

**Why it is third:** These platforms have search engine authority that personal blogs and GitHub READMEs do not. A post on DEV Community about "how to auto-format Python with Claude Code hooks" ranks in Google because DEV.to has domain authority. The post's canonical URL can point back to the marketplace blog (use the canonical URL feature) so the SEO value accumulates on the owned domain.

**What to publish:**
- "Claude Code hooks explained: what they are and why they matter" — evergreen primer, month 1
- "How to block dangerous commands in Claude Code" — practical tutorial, links to `bash-guard` hook page
- "Setting up automatic Python formatting with Claude Code hooks" — specific, searchable, month 2
- "The Claude Code hooks security model: capability declarations explained" — month 2, complements the CVE post
- "Building your first Claude Code hook in 15 minutes" — contributor acquisition content, month 3

Each post ends with a call to action: "Install the hook with `hookpm install <name>`" or "Browse all hooks at hookpm.dev/hooks". These CTAs drive CLI installs from readers who are already engaged.

### 4. Twitter / X

**Why it is fourth:** The Claude Code developer community is active on Twitter/X. Anthropic employees, Claude Code power users, and AI engineering practitioners are all reachable here. Twitter/X is a discovery channel, not a conversion channel — it raises awareness and builds recognition, but converts poorly to installs compared to search and HN.

**What to post:**
- Hook author spotlights (monthly threads, as described above)
- "Hook of the week" — a short thread explaining one hook, how to install it, what problem it solves
- Reactions to relevant news (new Claude Code releases, security disclosures, community discussions)
- Screenshots of `settings.json` before/after a CLI install — visual, shareable, demonstrates the value immediately

**Who to engage:**
Anthropic's developer relations accounts, Claude Code team members who are public on Twitter/X, and prominent AI engineering accounts that discuss Claude Code. Do not cold-pitch for retweets. Engage with their content genuinely first; the relationship comes before the amplification ask.

### 5. YouTube

**Why it is fifth:** YouTube is a long-term SEO channel with a 6–12 month lag before videos rank in YouTube search. It is not a Week 1 priority. But by Month 3, one video demonstrating the one-command install versus manual copy-paste is worth producing.

**The one video that matters most:** A side-by-side screen recording — left side shows manually copying a hook from GitHub, editing `settings.json` by hand, testing it, making a JSON syntax error, fixing it, finally getting it working. Right side shows `hookpm install bash-guard` completing in 4 seconds. No narration needed. The demonstration is self-explanatory.

This video targets the query "Claude Code hook install tutorial" and the YouTube equivalent. It is also the demo video that lives on the marketplace homepage.

---

## Part 6: The Security Angle as Marketing

### The CVEs Are a Content Asset

CVE-2025-59536 and CVE-2026-21852 document real attacks: hooks defined in shared `settings.json` files that execute arbitrary code when developers run Claude Code in a project directory. The attack surface is structural — any collaborator with write access to a repo containing a `.claude/settings.json` file can define hooks that execute on every team member's machine without their explicit consent.

This is not a theoretical risk. Check Point Research documented it. The community is aware of it. The marketplace's position is: we exist because this problem is real.

### The Write-Up Strategy

Publish two pieces, sequenced one month apart:

**Piece 1 (Month 1): The CVE write-up**

Title: `The two CVEs that make shared Claude Code hooks dangerous (and how to fix it)`

This is a responsible disclosure summary, not a how-to-attack guide. Structure: what hooks are, what the CVEs document, what the actual attack chain looks like (read the settings.json, find the hook block, see the malicious command — the attack is obvious to any reader who looks), what the capability declaration model does to mitigate it, and the conclusion: use reviewed hooks from a trusted registry.

Submit to: CVE disclosure channels, security-focused newsletters (Risky Business, tl;dr sec, Unsupervised Learning by Daniel Miessler), Hacker News.

**Piece 2 (Month 2): The builder's perspective**

Title: `How we review hooks for security (and what we reject)`

This is the internal security review checklist, made public. It covers: what the capability declaration fields mean and why they exist, what patterns trigger rejection (network calls without declared network capability, file writes outside the project directory, shell invocations that spawn child processes), and examples of hooks that were submitted and rejected (anonymized).

This piece does something the first piece cannot: it makes the review process legible. Developers who read it understand that the marketplace's verified badge means something. Enterprises who read it understand that the review process is systematic, not ad hoc.

### Where The Security Content Travels

The CVE write-up will be picked up by:
- AppSec Slack communities (DevSecOps, OWASP channels)
- Security newsletter curators who cover developer tooling vulnerabilities
- Developers who follow Check Point Research's publication feed
- Any Claude Code community member who reads about the CVEs and wants the solution

The builder's perspective will be picked up by:
- Developer communities that care about supply chain security (SolarWinds-era thinking applied to AI tools)
- Enterprises evaluating Claude Code for team use who need to understand the risk model
- Hook contributors who want to know what "verified" means before submitting

Both pieces generate backlinks from security-focused domains, which is among the highest-value link equity in any SEO strategy.

---

## Part 7: Enterprise Go-To-Market

### The Land Motion: Individual Developers First

Do not build for enterprises in Phase 1. Build for the individual Claude Code power user — the developer who has already set up hooks manually and knows the friction. They are the ones who will install the CLI in the first week, contribute the first hooks, and tell their team.

The enterprise discovery path is bottom-up and always has been for developer tools. Homebrew was used by engineers at companies for years before IT departments knew it existed. Docker started as "that thing the backend team runs locally." The pattern for developer-led SaaS: individual adopts → shares with team → team adopts → procurement notices → enterprise contract.

Do not shortcut this path. Trying to sell an enterprise private registry before there are 1,000 developers using the public registry is like trying to sell enterprise Slack before there are any Slack users. The credibility does not exist yet.

### The Expand Motion: Private Registry for Teams

When enterprise inquiries arrive (and they will, once the public registry has enough install volume to surface in IT departments' vendor review processes), the product is ready: a private registry that the enterprise's security team can host internally, with their own hook review process, their own verified badge criteria, and their own CLI configuration pointing to their internal registry instead of the public one.

The private registry is the enterprise product. It is not a separate codebase — it is the open-source registry spec run internally, with an enterprise support contract and SLA. The moat is the standard, not the software.

### Conference Presence

AI engineering conferences — not general tech conferences. The relevant venues are: AI Engineer World's Fair, the AI + DevTools track at developer events, any Anthropic-adjacent conference or summit.

The talk topic for Month 6+: "Governing AI agents at runtime: how hooks work and why your team needs a hook policy." This is not a product demo — it is a technical talk that happens to reference the marketplace as a reference implementation. Talks that educate rather than sell generate more enterprise pipeline than vendor booths.

No cold outbound to enterprises in Phase 1. No enterprise sales motion until the public registry has >500 hooks and >10,000 monthly installs. The inbound enterprise signal at that scale is worth 100x what cold outbound would generate at 100 hooks.

---

## Part 8: What Not to Do

These are specific anti-patterns for this product in this market. Each one has a plausible justification that does not hold up.

**Do not run paid ads.** There is no developer tool that scaled via paid search or social ads before finding organic traction. Developers have strong ad-blindness, especially for tools in the command-line / CLI category. The money is better spent on one good conference ticket or one bounty for a high-demand hook.

**Do not target everyone who uses Claude Code.** The total Claude Code user base includes many people who have never touched hooks and have no reason to. Marketing to them is noise. The target audience in Phase 1 is "developer who has already set up at least one hook manually" — they are the ones who feel the pain the marketplace solves. Reach them via HN, GitHub, and the Claude Code Discord, where they already congregate.

**Do not compete with awesome-claude-code.** `hesreallyhim/awesome-claude-code` has 21.6k stars and active curation. It is not a competitor — it is infrastructure. The marketplace should be listed in it, linked from it, and should link back to it from the website. The distinction is clear: awesome-claude-code is a directory; the marketplace is a package manager with a security model. These are complementary, not overlapping.

**Do not try to be an agent/skills/commands marketplace.** There are already several multi-type plugin marketplaces (`claude-market/marketplace`, `claudeforge/marketplace`, `hyperskill/claude-code-marketplace`). None of them is winning because none of them is the best at any one thing. Being the best at hooks — only hooks — is a winnable position. Being the fourth-best at hooks, commands, agents, and skills is not.

**Do not launch without the `settings.json` manipulation working correctly.** This is the core value delivery. If `hookpm install bash-guard` corrupts a developer's `settings.json`, or fails silently, or requires manual editing to complete — the product is broken and the reputation damage outlasts the bug fix. Do not ship until this works for every edge case: file does not exist, file exists with no hooks key, file exists with hooks for other events, merging without duplicating.

**Do not build in private.** The registry must be public from day one. The security credibility claim ("we review hooks") is meaningless if the review process is invisible. The contributor story ("open PRs to add hooks") is impossible if the registry is closed. Closed source and a developer tools community trust model are incompatible.

---

## Part 9: Metrics That Matter

These are the five metrics to track weekly in a simple dashboard. Everything else is vanity.

| Metric | What It Measures | Target (Month 3) | Target (Month 12) |
|---|---|---|---|
| GitHub stars (registry repo) | Credibility signal — determines whether a developer trusts the project enough to use it | 1,000 | 5,000 |
| Monthly hook installs | Usage signal — actual developer engagement with the product | 500 | 10,000 |
| Number of hooks in registry | Catalog quality — determines whether the marketplace can answer the queries it claims to answer | 50 | 500 |
| Number of contributors | Community health — determines whether the catalog grows without the founder writing every hook | 10 | 100 |
| Certified / verified hook count | Monetization precursor — enterprises will pay for access to the verified tier | 10 | 100 |

### What These Metrics Are Not

Install count is not daily active users. A developer who installed `bash-guard` three months ago and has not thought about it since is still getting value every day — the hook runs silently in the background. Do not mistake low re-engagement with low retention.

GitHub stars are not revenue. They are credibility. They matter because they change the evaluation threshold for a developer who encounters the marketplace for the first time. Track them, celebrate milestones, but do not mistake them for business success.

Contributor count is not community health by itself. Ten contributors who actively review PRs and maintain their hooks is a healthier community than 100 contributors who opened one PR six months ago and never came back. Track active contributors (at least one contribution in the last 90 days) separately from total contributors.

---

## Part 10: 12-Month Summary Timeline

| Phase | Weeks | Focus | Key Output |
|---|---|---|---|
| **Launch** | 1 | 10 hooks + CLI v0.1 + Show HN | 500 stars, 100 installs |
| **Content** | 2–4 | CVE blog post, DEV Community tutorials, community DMs | Organic search traction begins |
| **Catalog** | 5–12 | Community contributions, PR review, 50+ hooks | Long-tail search pages indexed |
| **Authority** | Month 3 | Hook author spotlights, Hook of the Month cadence, second HN post | 1,000 stars, 10 contributors |
| **Depth** | Month 4–6 | YouTube demo video, Hashnode tutorial series, Discord community active | 500+ monthly installs |
| **Scale** | Month 7–9 | Conference talk submission, enterprise inbound handling, 200+ hooks | First enterprise inquiry |
| **Sustain** | Month 10–12 | Private registry beta, annual review of what worked, 500+ hooks target | Recurring revenue path clear |

The strategy does not require perfection at launch. It requires one thing at launch: a working CLI that installs hooks into `settings.json` from a public registry. Everything else — the SEO flywheel, the community, the security moat, the enterprise motion — builds on top of that one working thing.

The window to own this category is open now. The CVEs have been disclosed. The community is active. No one has shipped a package manager for hooks yet. The first credible answer to "hookpm install" wins the standard.
