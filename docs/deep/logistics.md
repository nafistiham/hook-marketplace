# Hook Marketplace — Logistics and Operations

**Date:** 2026-03-10
**Audience:** Founder setting this up from scratch
**Scope:** Legal structure, infrastructure, team, security operations, payment processing, tooling

---

## Legal Structure

### Which Entity to Form

Form a **Delaware C-Corporation**, not an LLC.

The reasoning is specific to your situation. You are building an OSS-first product with an intent to raise venture capital, issue equity to early contributors, and eventually sell to enterprise customers. None of those three goals are well-served by an LLC.

- **Venture capital requires C-Corp.** Most institutional investors will not write a check into an LLC. The preference is so strong that many term sheets condition funding on conversion. Forming a C-Corp from the start avoids the conversion cost (typically $5,000–$15,000 in legal fees) at a worse time.
- **Delaware specifically, not your home state.** Delaware has the most developed corporate case law. Enterprise procurement teams and their legal counsel recognize Delaware C-Corps. When you eventually have a legal dispute with a customer or employee, the body of precedent works in your favor.
- **ISOs require C-Corp.** If you want to grant Incentive Stock Options to early engineers, that requires a C-Corp. LLCs issue "profits interests," which are more complex to structure and less understood by employees.

If you are pre-revenue and genuinely cannot afford the incorporation fees (roughly $500–$1,500 all-in via Stripe Atlas, Clerky, or Firstbase), forming an LLC in your home state as a temporary structure is acceptable. But plan to convert to a Delaware C-Corp before you take your first investor meeting or enterprise contract. The conversion delay costs more than the early formation cost.

**Do not:** form an S-Corp. S-Corps cannot have corporate shareholders, which blocks institutional investment entirely.

### When to Incorporate

Incorporate before the first dollar of revenue arrives. The practical trigger is: as soon as a customer or user is willing to pay, you need an entity to receive the payment, sign a contract, and own the IP. If you receive payment as an individual, you have created a tax and IP ownership problem that is expensive to unwind.

The safer rule: **incorporate when you write the first line of production code.** IP assignment is cleaner when there is an entity from the beginning. If you write the CLI and then incorporate, you will need to execute an IP assignment agreement to transfer the IP from yourself-as-individual to the company. This is solvable but unnecessary.

### Open Source Licensing Strategy

The licensing choices are load-bearing decisions. Get them wrong and you either invite forks that undercut your business or create license friction that slows adoption.

**CLI tool (`hookpm`): MIT**

MIT maximizes adoption. Developers will check the license before integrating your CLI into their workflow, CI system, or internal tooling. Any license with restrictions (GPL, AGPL, BSL) will cause enterprise developers to route around you. The CLI is the distribution mechanism, not the monetization mechanism — optimize it for adoption.

**Registry specification (the `hook.json` schema, the registry index format): CC0**

CC0 (Creative Commons Zero — public domain dedication) is the correct choice here, not MIT. The difference matters: MIT still has attribution requirements; CC0 has none. A specification that requires attribution creates friction when other tools want to implement compatibility. The registry spec should be as open as possible so that Anthropic, third-party CLIs, and future tooling can implement it without legal review. The spec being CC0 does not prevent you from monetizing around it — npm's spec is effectively public domain and npm generated over $100M in annual revenue.

If CC0 feels too open, use MIT. Do not use Creative Commons Attribution (CC BY) for a technical specification — the attribution requirement is incompatible with how specifications are embedded in software.

**Certification tooling (the review pipeline, the signing infrastructure): Business Source License 1.1 (BSL 1.1)**

This is the component where your defensive moat lives. The certification tooling is what produces the verified badge, runs the automated static analysis, manages the signing keys, and tracks review history. If you open source it under MIT, a competitor (or Anthropic) can replicate your verification infrastructure in a weekend.

BSL 1.1 (the license HashiCorp used for Terraform before the OpenTofu controversy) allows:
- Anyone to view, modify, and use the code for non-production purposes
- Commercial competitors cannot use it to build a competing certification service
- After a set period (typically 4 years), the code converts to a fully open source license (Apache 2.0)

The BSL controversy with Terraform happened because HashiCorp applied it retroactively to infrastructure that the community had built around. You are applying BSL from the start, to tooling that you built, for components where the rationale is clear. That is a defensible position.

An alternative: keep the certification tooling entirely proprietary (closed source). This is simpler and avoids the "BSL is not real open source" criticism. The tradeoff: enterprise customers who require source code access (for security audits) cannot get it. If enterprise sales is a year-2+ concern, start proprietary and consider BSL later if enterprise customers push for it.

**Summary:**

| Component | License | Rationale |
|---|---|---|
| `hookpm` CLI | MIT | Maximize adoption |
| Registry spec / `hook.json` schema | CC0 | Enable ecosystem compatibility |
| Registry index and automation | MIT | Encourage contribution |
| Certification tooling | BSL 1.1 or proprietary | Protect the revenue-generating moat |

### Contributor License Agreement (CLA)

You need a CLA before you accept the first external pull request to any repository under your organization's GitHub org.

The CLA serves two purposes. First, it ensures that contributors grant you the right to use their code under any license, including future commercial licenses. Without a CLA, if you ever want to change the license on the registry tooling (as HashiCorp did with Terraform), you need consent from every contributor. With a CLA, the contributor has already granted you that right.

Second, the CLA establishes that the contributor has the right to contribute the code (they are not copying proprietary code from their employer).

Use the **Individual CLA from the Contributor License Agreement (CLA) project** (cla-assistant.io or clabot). This is a standard, widely-accepted form. Do not write your own — a custom CLA triggers legal review from contributors' employers and slows contributions. The Apache Software Foundation CLA or the Google CLA are reasonable starting templates.

CLA implementation: use `cla-assistant` (GitHub App, free). It enforces CLA signing as a required status check on every pull request. First-time contributors are prompted to sign before their PR can be merged.

### Privacy Policy Requirements

You will need a privacy policy before you launch publicly, even in Phase 1. The install count telemetry (even aggregated), any usage analytics you collect, and any email addresses you gather for launch notifications are all covered.

**GDPR (EU):** If any EU users install your CLI, you are a data controller under GDPR. The practical requirements: post a privacy policy describing what you collect and why, provide a mechanism for users to request deletion of their data, do not share personal data with third parties without consent. The CLI's install telemetry (if any) must be opt-in, not opt-out, for EU users. Using Plausible Analytics (privacy-respecting, no cookies, no personal data collection) sidesteps most GDPR concerns because Plausible does not collect personal data.

**CCPA (California):** If you have California users (you will), you need a privacy policy that describes data collection. CCPA becomes more operationally significant once you have $25M+ in revenue or 100,000+ California consumers — you are not there in Phase 1. But the privacy policy requirement still applies.

**Practical step:** Use Iubenda or Termly to generate a privacy policy and terms of service on day one. Cost: $0–$130/year. This is not the time for custom legal drafting.

---

## Infrastructure Stack

### Phase 1: GitHub-Backed, $0–$10/Month

This is the correct starting point. Do not build infrastructure you do not need. The goal in Phase 1 is to prove that developers will install hooks via a CLI and that hook authors will submit hooks via PRs. Both of those are provable with GitHub as the backend.

**Registry:** A GitHub repository (`hookpm-registry/registry`) with a `hooks/` directory containing one `hook.json` per hook, and a `registry.json` index file at the root. A GitHub Actions workflow regenerates `registry.json` on every merge to main. The CLI fetches `registry.json` from a raw GitHub URL (or Cloudflare CDN in front of it).

**CLI distribution:** Publish `hookpm` as an npm package. This gives you `npm install -g hookpm` for free, global distribution via npm's infrastructure, versioning, and install counts. npm is the right choice specifically because your target users are developers who already have Node.js installed (they use Claude Code, which requires Node.js).

**Documentation:** Deploy to Cloudflare Pages (free tier). Connect your GitHub repo and every push to `main` redeploys the docs site. Cloudflare Pages has no bandwidth limits on the free tier, which matters when a blog post or HN thread drives a traffic spike.

**Analytics:** Plausible Analytics at $9/month. The reason to pay for Plausible instead of using Google Analytics for free: Google Analytics requires a cookie consent banner under GDPR, which is friction on a developer-facing docs site. Plausible collects no personal data and requires no consent banner. It gives you page views, top pages, and referrer data — which is all you need in Phase 1. The $9/month is the correct call.

**Total Phase 1 infrastructure cost: ~$10/month** (Plausible only). Everything else runs on free tiers.

**What Phase 1 does not include:** a hosted API, a database, object storage, auth, or any custom server infrastructure. The moment you spin up a server, you own availability, security, and operations overhead. Do not do this until you have validated that people actually use the product.

### Phase 2: Hosted Registry, $150–$400/Month

Phase 2 starts when GitHub-backed infrastructure has a concrete limitation you need to solve. The triggers are: search performance is inadequate (the static `registry.json` index does not support fuzzy search), you need real-time install counts, or you need user accounts for hook authors.

**Registry API:** Deploy on Fly.io or Railway. Both are low-ops platforms where a TypeScript/Hono API is deployed via `flyctl deploy` or `railway up` without managing containers or Kubernetes. Fly.io has a slight edge for global edge deployment (important for CLI latency from different regions). Estimated cost: $20–$50/month for a small API with modest traffic.

**Database:** Supabase (Postgres). The reasons to choose Supabase over PlanetScale (MySQL): Postgres is a better fit for the JSON-heavy registry schema, Supabase includes auth out of the box (relevant when you add hook author accounts), and the free tier is generous enough to start. PlanetScale's MySQL-compatible interface is excellent for high-throughput write-heavy workloads — that is not your registry's access pattern. Estimated cost: $0–$25/month depending on usage.

**Object storage:** Cloudflare R2. This is the correct choice specifically because R2 has zero egress fees. Hook files (shell scripts, TypeScript files) are fetched every time a developer installs a hook. With S3, you pay per GB of egress; a popular hook installed 10,000 times costs real money in egress. With R2, egress is free. This is not a minor optimization — egress fees are how cloud storage costs scale unpredictably. Estimated cost: $0–$5/month for Phase 2 storage volumes.

**CDN:** Cloudflare. You are already using Cloudflare R2, which is served through Cloudflare's network natively. The CDN is free and automatic. Do not add a separate CDN layer.

**Auth:** Clerk for Phase 2. The reason: Clerk handles email/password, OAuth (GitHub login is the obvious choice for a developer tool), magic links, and session management with a frontend SDK that takes a day to integrate, not a week. WorkOS is better for enterprise SSO (SAML, SCIM), but that is a Phase 3 requirement. Clerk costs $0 on the free tier up to 10,000 MAU, which covers most of Phase 2.

**Total Phase 2 infrastructure cost: ~$150–$400/month** depending on database tier, API instance size, and Plausible plan.

### Phase 3: Enterprise-Ready, $500–$2,000/Month

Phase 3 infrastructure is driven by enterprise requirements, not product idealism. You build what enterprise procurement checklists require.

**Dedicated infrastructure with SLA:** Move from shared Fly.io infrastructure to dedicated instances. Enterprise customers will ask about uptime SLAs during procurement. A 99.9% SLA requires dedicated infrastructure with health checks, automatic failover, and a status page (statuspage.io, $79/month or hosted on your domain with a simple static page). Estimated cost: $200–$500/month for dedicated compute.

**SOC 2 Type II certification:** This is the most expensive and most important Phase 3 operational investment. Enterprise security teams require SOC 2 Type II before approving any vendor. The process:
- Hire a SOC 2 readiness consultant or use a compliance automation platform (Vanta, Drata, or Secureframe — all cost $10,000–$20,000/year)
- Implement the required controls (access management, change management, incident response, monitoring)
- Engage an auditor (Ernst & Young, KPMG, or a specialized firm like A-LIGN — $15,000–$30,000 one-time audit fee)
- The Type II audit covers a 6-month observation period, so you need to start the process 9–12 months before you need the certification

Do not start SOC 2 until you have a signed enterprise customer who requires it or a clear pipeline of 3+ enterprise prospects who will require it. The certification costs $25,000–$50,000 all-in for the first year and $10,000–$15,000/year to maintain. That cost only makes sense against enterprise ARR that justifies it.

**Enterprise SSO:** WorkOS at Phase 3. WorkOS handles SAML, OIDC, and SCIM provisioning with a single API integration. Pricing: $0–$125/month per organization on their enterprise plan. WorkOS is purpose-built for this use case and integrates with Clerk (which you will already have from Phase 2) via a documented migration path.

**Audit logging:** Structured logs are required for enterprise compliance ("who installed which hook, on which machine, at what time"). Use Axiom ($25/month base) rather than Datadog (expensive at scale) for Phase 3 initially. Axiom accepts structured JSON logs via an ingest API, stores them with long retention, and provides a query interface. When an enterprise customer asks for an audit export, you query Axiom and export CSV. Datadog is the right choice if you need APM + logging + alerting in one platform with enterprise SLA — but that is a $1,000+/month decision. Make it when you have revenue to justify it.

**Total Phase 3 infrastructure cost: $500–$2,000/month** (excluding SOC 2 audit costs, which are one-time capital expenses).

---

## Team Structure

### Phase 1: Solo Founder

This is a 40–60 hour per week role covering everything. There is no hiring in Phase 1, and there should not be. The goal is to validate the product concept, not to staff a company.

**What the founder does:**
- Builds the CLI (`hookpm` v0.1 through v0.3)
- Writes the Tier 1 hooks (the five foundation hooks that cover 80% of use cases)
- Manages the registry (reviewing and merging hook PRs)
- Writes all documentation
- Posts to Hacker News, writes blog posts, participates in Discord servers where Claude Code users gather
- Responds to every GitHub issue personally

**Key risk in Phase 1:** breadth over depth. The instinct is to build the website, the verification portal, the badge system, and the enterprise tier in parallel because they are all important. The correct response to that instinct is to ignore it. Phase 1 has one deliverable: a working package manager that installs hooks correctly. Build that and nothing else.

The signal to move to Phase 2 is not a date on a calendar — it is evidence of product-market fit: the CLI has 1,000+ installs, at least 20 third-party hook submissions, and 3+ people have asked to pay for something. Any two of the three is sufficient.

### Phase 2: Founder Plus One

The first hire is the most consequential decision in the company's first two years. It will be wrong 40% of the time regardless of how carefully you hire. The frame that helps: hire for the constraint, not the org chart.

**The constraint in Phase 2** is not engineering capacity — it is community and credibility. You can ship features. You cannot scale community presence. Hook authors decide whether to submit their hooks to your registry or to build their own based almost entirely on whether the registry feels like a real, maintained, active community. This requires presence: answering GitHub issues quickly, promoting good hooks on social media, running a Discord, writing tutorials.

**Hire 1: Developer Relations, not a backend engineer.** The backend in Phase 2 is a Hono API + Supabase + Cloudflare — it is not complex enough to require a dedicated engineer. A developer advocate who can write code (to triage and help with hook author issues) but primarily spends time on community, content, and outreach creates more value in Phase 2 than a second engineer.

If the registry API becomes genuinely complex (heavy traffic, security incidents, enterprise customer integrations), then shift to hiring a backend engineer first. But by default: community over engineering at this stage.

**Equity split considerations for a Phase 2 hire:** A developer relations hire who is employee number one, joining at low salary in an unproven product, should receive 0.5%–2.0% equity depending on seniority, salary discount from market rate, and vesting schedule. Use a 4-year vest with a 1-year cliff. Do not give more than 2% to a non-technical early employee without board-level discussion.

### Phase 3: Team of Three to Four

**Founder: CEO/product.** Transitions from doing everything to owning enterprise sales, product roadmap, and investor relationships. Still writes code occasionally but is no longer the primary engineer.

**Backend engineer.** The first technical hire after the developer advocate. This person owns registry infrastructure, enterprise features (SSO, audit logging, air-gapped mirror), and the security review tooling. Should be comfortable with TypeScript, Postgres, and Cloudflare infrastructure.

**Developer advocate.** The Phase 2 developer relations hire, now full-time on community, content, and hook author support. Owns the Discord, the tutorial blog, and relationships with major hook authors.

**Security reviewer (contract, not full-time).** Do not hire a full-time security reviewer until you have enterprise revenue that justifies it. Instead, contract with a freelance security engineer (or a small security consultancy) to perform manual reviews for the Verified badge program. Budget $150–$200/hour for 5–10 hours per verified hook. At the certification pricing modeled below, this is margin-positive from the first review.

---

## Security Review Operations

The security review process is the hardest operational challenge in this product. It is also the defensible moat. Handle it sloppily and you create liability. Handle it well and you create the trust infrastructure that enterprise customers pay for.

### Intake

Hook authors initiate certification by running `hookpm publish --certified` (or by submitting a form linked from the registry). This creates a pull request in the registry GitHub repository with the `hook.json` manifest, the hook implementation, and a filled-out security disclosure template.

The security disclosure template asks:
- What does this hook do? (plain language)
- What events does it hook? (from the known event list)
- Does it make network requests? To what domains?
- Does it read or write files outside of the Claude working directory?
- Does it spawn child processes?
- Does it read or modify environment variables?
- Is there any behavior that only occurs under specific conditions (flags, environment variables, system state)?

This template creates a paper trail that makes both automated and manual review tractable. A hook author who lies on the template is not just failing a security review — they are making a false representation you can point to if the hook turns out to be malicious.

### Automated Checks

Automated checks run on every pull request, including community (unverified) submissions. They complete in 3–5 minutes and block merge on severe findings.

**What the automated pipeline checks:**

1. **Shellcheck** for bash hooks. Shellcheck catches common shell scripting bugs and dangerous patterns. Shellcheck failures that indicate security issues (unquoted variables in `eval`, command injection patterns) are blocking; stylistic issues are non-blocking warnings.

2. **ESLint with a security plugin** (eslint-plugin-security) for TypeScript hooks. Flags `eval`, prototype pollution patterns, and unsafe regular expressions.

3. **Capability declaration audit.** A grep-based scanner checks for a mismatch between what the `hook.json` declares and what the implementation does. If `capabilities.network_access` is `false` but the implementation contains `curl`, `fetch`, `axios`, `wget`, or `http.get`, the check fails. If `capabilities.spawns_processes` is `false` but the implementation uses `exec`, `spawn`, or `child_process`, the check fails. This is not a sandbox — a sophisticated attacker can defeat it. But it catches 95% of accidental mismatches and all lazy malicious actors.

4. **Known-malicious pattern detection.** A YARA-style rule set checks for: base64-decoded command execution (`base64 -d | bash`), credential harvesting patterns (reading from `~/.aws/credentials`, `~/.ssh/`, `~/.claude/`), reverse shell patterns, and exfiltration patterns (POST requests to external IPs from hooks that claim no network access). Maintain this rule set actively — it is the primary defense against supply-chain attacks.

5. **Dependency audit for npm-based hooks.** Run `npm audit` against the hook's `package.json`. Hooks with critical CVEs in dependencies are blocked from merging until the dependency is updated.

### Manual Review (Certified Tier Only)

Manual review is triggered only for hooks that have paid the certification fee and passed automated checks. The reviewer is a human with security engineering background.

**What the manual review covers:**

- Read the full implementation against the capability declarations. This takes 15–45 minutes depending on hook complexity. The reviewer is looking for: deceptive logic (code paths that only execute under specific conditions not mentioned in the template), obfuscated code (base64, compressed strings, dynamic code construction), and backdoors.

- Test the hook against adversarial inputs. Specifically: what happens if the hook receives malformed JSON on stdin? What happens if `tool_input` contains shell metacharacters? What happens if the hook is installed in a directory with a malicious `hook.json` that overrides the expected behavior? The hook should fail safely (exit non-zero, print an error) not dangerously (execute arbitrary code from the input).

- Check specifically for CVE-2025-59536 and CVE-2026-21852 patterns. Both CVEs involve hooks or project files that execute attacker-controlled commands. A hook that reads from `tool_input` and passes that input unsanitized to a shell command (`exec(toolInput.command)`) is a critical finding.

- Verify that the hook's behavior matches its description in simple language. A hook that claims to "notify you when Claude completes a task" but also reads your `~/.ssh/` directory is a finding regardless of whether the SSH read is visible to static analysis.

**The reviewer signs off** by:
1. Adding their review summary to the PR
2. Updating the `hook.json` `security` block with `"verified": true`, their identifier, and the review date
3. Triggering the signing step that creates a detached signature over the manifest

**SLA:** Community (unverified) submissions have no SLA. Merge happens when a maintainer gets to it. Certified submissions: 5–10 business days from payment confirmation to review completion. If the reviewer finds issues, the clock stops until the author addresses them.

### Cryptographic Signing

Verified hook manifests are signed with the registry's private key using `minisign` (simpler than GPG, purpose-built for software signing). The public key is embedded in the `hookpm` CLI binary at build time. At install time, `hookpm` verifies the signature before writing anything to `settings.json`. If the signature does not verify (tampered manifest, MITM), installation aborts with a clear error.

Key management: the private signing key is stored in a hardware security module (YubiKey or AWS KMS) and never on disk. Key rotation procedure should be documented before the first hook is signed.

---

## Hook Submission Workflow

This is the step-by-step process from the hook author's perspective for a community (unverified) submission.

**Step 1: Fork the registry repository.** The author forks `hookpm-registry/registry` on GitHub.

**Step 2: Create the hook directory.** The author creates `hooks/<hookname>/` and adds two required files: `hook.json` (the manifest, following the schema) and the implementation (a shell script, TypeScript file, or HTTP endpoint definition).

**Step 3: Submit a pull request.** The PR must use the hook submission template, which auto-populates from a `.github/PULL_REQUEST_TEMPLATE/hook_submission.md` file. The template asks for: the hook's purpose in plain language, the events it handles, and confirmation that the author has tested it against their own Claude Code installation.

**Step 4: Automated checks run (3–5 minutes).** GitHub Actions triggers the automated pipeline. Results are posted as PR comments. Blocking failures require the author to fix and re-push. Non-blocking warnings are listed but do not block merge.

**Step 5: Community review period (48 hours minimum for simple hooks, 7 days for complex or security-sensitive hooks).** The PR is visible to the community. Other hook authors can comment, suggest improvements, or flag concerns. This is not a formal review — it is a social signal that the registry is actively maintained and that submissions are evaluated.

**Step 6: Maintainer merge.** A maintainer (the founder in Phase 1, the developer advocate in Phase 2+) reviews the PR, applies any requested changes, and merges it.

**Step 7: Index regeneration.** A GitHub Actions workflow triggered on merge regenerates `registry.json` and deploys it to Cloudflare CDN. The hook is available via `hookpm install <hookname>` within 60 seconds of the merge.

**For certification (paid review), an additional step occurs between Steps 4 and 5:**

**Step 4a: Payment and manual review initiation.** After automated checks pass, the author pays the certification fee (via Stripe, see payment processing section) and the manual review queue is triggered. The PR is labeled `pending-certification-review`. The SLA clock starts.

**Step 4b: Manual review.** A security reviewer performs the manual review as described above. If issues are found, the author is notified via PR comment and the SLA clock pauses.

**Step 4c: Signing.** Upon passing manual review, the manifest is signed. The PR is labeled `certification-approved`.

**Step 5 (certification path):** The 48-hour community review period still applies after certification approval. Community review and certification review are independent signals.

---

## Payment Processing

### When to Add Payments

Add payment processing when three or more people have independently asked how to pay for something. Not when you think the feature is ready. Not on a launch timeline. When people volunteer their credit card number unprompted.

This is not a philosophical point — it is an operational one. Payment processing adds compliance obligations (PCI DSS, even at the Stripe-managed level), accounting complexity, and customer support surface area. Do not take on those obligations before you have validated that someone will pay.

The first paid feature to launch is the annual certification fee, not the monthly enterprise subscription. Annual billing is simpler: one charge, one invoice, one renewal cycle. Monthly billing requires proration logic, cancellation handling, and failed payment retries. Build annual first, add monthly when you have enough customers that annual-only is a constraint.

### Stripe

Use Stripe for all payment processing. Stripe handles:
- Credit card processing with PCI DSS compliance managed by Stripe
- Invoicing and receipts
- Annual subscription management (automatic renewal)
- Webhook events for payment success, failure, and cancellation

For the certification fee, use Stripe Payment Links (no code required) in Phase 1. A Stripe Payment Link is a URL that opens a Stripe-hosted checkout page. The author pays, Stripe sends you a webhook, and you manually trigger the review queue. This is not scalable, but it requires zero engineering and works for the first 50 certifications.

When you have 20+ certifications/month, build a proper integration: certification submission form → Stripe Checkout → webhook → automatic review queue trigger → certification status tracking in your database. This is a Phase 2 engineering task.

### Lemon Squeezy as an Alternative

Consider Lemon Squeezy specifically for the EU VAT problem. When you sell digital products to EU customers, you are required to collect and remit VAT in each EU member state where customers reside. This is a compliance nightmare if you handle it yourself — 27 different VAT rates, different filing requirements, different thresholds.

Lemon Squeezy acts as the Merchant of Record for your transactions, which means they collect and remit EU VAT on your behalf. You receive the net amount; they handle the tax compliance. The tradeoff: Lemon Squeezy charges 5% + $0.50 per transaction (compared to Stripe's 2.9% + $0.30). The premium is worth paying if a meaningful portion of your certification customers are in the EU.

Practical recommendation: start with Stripe Payment Links. Add Lemon Squeezy when you have EU enterprise customers or when you receive your first EU VAT compliance notice.

---

## Tooling Stack

Specific tools for each function, with reasoning.

### CLI

**TypeScript + Node.js.** The alternative to consider seriously is Go (smaller binary, no runtime dependency, faster startup). Go loses because your target contributors are developers who work with TypeScript daily — they can fix a TypeScript CLI bug in 20 minutes; they need a full afternoon to get their Go environment working and understand the idioms. The community contribution barrier matters more than binary size.

The CLI should be published as both an npm package (`npm install -g hookpm`) and as standalone binaries (via `pkg` or `bun build --compile`) for users who do not want to install Node.js globally. Build the npm package first; add binaries when someone files an issue asking for them.

### Registry API (Phase 2+)

**Hono on Bun or Node.js.** Hono is a lightweight TypeScript web framework with excellent performance, a clean API, and first-class Cloudflare Workers support. If you ever need to move the registry API to Cloudflare Workers for global edge deployment (lower latency for `hookpm install` from Asia or Europe), Hono makes that migration trivial. Fastify is a valid alternative if you prefer the Node.js ecosystem more strictly.

Do not use Express. Express is fine but its lack of TypeScript-first design means more boilerplate for typed request/response handlers in a codebase that will handle structured JSON extensively.

### Documentation

**Starlight (Astro-based).** Starlight is built specifically for OSS documentation sites. It generates static HTML, deploys to Cloudflare Pages, has excellent search out of the box (Pagefind, no external service required), and follows best practices for developer documentation (dark mode, code syntax highlighting, sidebar navigation, versioning support). The Astro ecosystem is mature enough that you will find answers to customization questions quickly.

The alternative is Docusaurus (Meta's OSS docs framework). Docusaurus is React-based and equally capable. Choose Starlight if you are comfortable with Astro; choose Docusaurus if your team has more React experience. Either is correct.

### Issue Tracking

**GitHub Issues.** Keep everything in one place. Using a separate project management tool (Linear, Jira, Notion) in Phase 1 is overhead you do not need. GitHub Issues are visible to contributors, which is an advantage for an OSS project — contributors can see what is being worked on, report bugs in the same interface where they submit PRs, and follow up on issues they care about.

Add GitHub Projects (the built-in kanban board) when the issue backlog becomes unmanageable. That happens around 200+ open issues. You are not there in Phase 1.

### Community

**Discord.** The correct choice for a developer tool community in 2026. Developers expect Discord for real-time community interaction around OSS projects. Slack has two problems for this use case: message history is gated on the paid plan (messages older than 90 days disappear on free), and Slack's culture skews toward internal company communication rather than open community. Discord keeps full message history on the free tier and has a developer-tool community culture.

Set up Discord with four channels to start: `#general`, `#hook-showcase`, `#help`, and `#registry-submissions`. Add channels when the existing ones are too noisy. Do not pre-create 20 channels — empty channels signal a dead community.

### Analytics

**Plausible.** As discussed in the infrastructure section, Plausible's privacy-respecting approach eliminates GDPR cookie consent friction. Beyond the compliance benefit: install count for each hook is public data (you will show it on the hook's registry page). Plausible's dashboard is clean enough that you can share a public read-only dashboard link with hook authors so they can see their hook's install trajectory without needing a login.

Track two metrics obsessively in Phase 1: CLI installs per week (from npm download counts) and hook submissions per month (from GitHub PR count). These are the two leading indicators of whether the product is working.

---

*Document scope: legal structure, infrastructure, team, security review operations, hook submission workflow, payment processing, and tooling. Refer to `03-business-model.md` for revenue model detail and pricing tiers.*
