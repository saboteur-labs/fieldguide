## Concept: Fieldguide

### Problem & Value
Developers who keep several projects need guides for two very different readers: people who use the product, and developers who work on the code. In practice these guides drift. They mix jargon into user help, leave gotchas out of onboarding, and make claims nobody checked against the running software. In Getwrite's case, the old user pages were found to contradict each other about whether revisions are pruned. AI agents can now write a lot of documentation quickly, which makes the problem worse unless something tells them what to focus on for each audience, how to structure the guide, and how to prove each claim. A repeatable method, a content format, and a renderer that applies each project's brand would make guides trustworthy and consistent across projects, whether a human or an agent writes them.

### Target Audience
- **Primary:** Solo developers and small teams who maintain several projects and want web-published guides without a docs team. Many of them will use AI agents to draft and check those guides. For MVP, the guides they produce are for non-developer users of their products.
- **Secondary:** AI coding agents, as executors of the method (in any harness, not just one vendor's).
- **Secondary:** Maintainers of existing sites that want a validated handbook format to render with their own stack.

### Core Concept
Fieldguide is a method plus a toolchain that lives outside the projects it documents. The guide content lives in each project's own repo and versions with the code it describes. The method is a fixed sequence. First, declare the **audience** (user or developer) and the **guide type** (user handbook, developer onboarding, and so on). The audience decides the writing rules: user guides explain what the product does, in plain language, at a reading level the project sets; developer guides describe the architecture as observed, repo documentation, edge cases, and gotchas. Next, plan the **page breakdown** before writing. Then write, checking claims against the software as you go.

Verification has a configurable level that the project sets. At the strict level, which Getwrite uses, every factual statement needs a recorded check made by running the software, and a statement that can't be checked gets dropped. Looser levels allow checks made by reading the source. The level and the evidence live in a verification record kept alongside the guide, never in the text readers see.

Pages are Markdown with structured front matter. Fieldguide validates them, then either renders a static HTML site themed by a brand config, or hands the validated content to an existing site to render. All instructions are written as plain, agent-agnostic Markdown, so a human, Claude, or any other agent follows the same rules. To start, Fieldguide is distributed the way `saboteur-sites` is: as a reference repo. An entry-point file tells an agent (or a human) which files to load for a given task. The method docs and prompts live in the repo, and the validator and renderer run from a local checkout against a project's path.

### Key Capabilities
- Writers can declare audience and guide type, and get audience-specific writing rules and a suggested page structure.
- Projects can set a target reading level and the phrases to avoid or ban.
- Writers (human or AI) can follow a step-by-step method from planning through verified pages.
- Projects can set how strict verification is, and the toolchain enforces that level.
- The system validates front matter, links, and structure, and reports what fails.
- Users can render a guide to an accessible static site styled by their own brand config.
- Existing sites can consume the validated content format without using Fieldguide's renderer.
- Agents can run the method with skill wrappers for specific harnesses, on top of the agent-agnostic instructions.

### Feature Milestones
**MVP** (non-developer user handbook only)
- User-audience method: plain-language writing rules, per-guide writing-rules config, and a page-breakdown template for the handbook. The core value for the MVP focus. The config holds a target US school grade level (a target, not a pass/fail gate), banned phrases, phrases to avoid with a suggested replacement for each, and allowed terms (product names and on-screen labels that must appear as the product shows them). Fieldguide ships default lists that a guide adds to or switches off item by item. Rules are per guide, not per project, because a user handbook and developer onboarding need opposite rules about jargon.
- Page schema and a validator (front matter, relative links, index coverage, and banned or avoided phrases reported as warnings). Rendering and verification both depend on it; the phrase check is a plain text search, so it costs little to include.
- A verification record and project-set strictness level, with a check that every page is covered. Unchecked claims are the failure Fieldguide exists to prevent, so this can't wait.
- A static renderer: basic navigation (no search in MVP), mobile layout, light and dark themes, brand tokens (colors, fonts, logo), meeting WCAG 2.2 AA. Accessibility is a requirement, not an enhancement.
- Distribution as a reference repo with an agent entry point, and Getwrite's user handbook as the first proof case. Getwrite already conforms to a near-identical schema.

**v1**
- Developer audience: writing rules for observed architecture, repo docs, edge cases and gotchas, plus the developer onboarding guide type. Deferred because MVP focuses on non-developer users.
- Screenshots in pages, with verification of what they show. Valuable for users, but they add page-format, renderer and staleness work.
- A writing-rules linter that reports reading grade per page and gives suggested replacements in context. MVP has only the phrase warnings.
- Claude Code skill wrappers built on the agent-agnostic docs, symlinked as in `saboteur-sites`.
- A documented content contract for external sites, such as a Saboteur Astro handbook surface. This is the "both" output mode.

**v2**
- Release-tag publishing, plus drift detection that flags pages touched by commits made after the page was verified. Getwrite already does this by hand.
- Skill wrappers for other agent harnesses. This serves the secondary audience.
- Further user guide types (getting started, FAQ, troubleshooting) and richer theming (layouts, components).
- A packaged install (such as an npm CLI), once the content format has settled.

### What This Is Not
- Not a hosting service. Users deploy the output themselves.
- Not a general docs-site framework competing with Docusaurus. It targets guides, not API references or blogs.
- Not an API reference generator from code comments.
- Not a central store of other projects' content.
- Not an automated app tester. It defines how verification is recorded; projects bring their own run tooling.

### Competitive Landscape
**Diátaxis**
- A documentation framework (tutorials, how-to guides, reference, explanation), widely cited.
- Overlap: it classifies guide purposes.
- Difference: no tooling, no verification, and it doesn't split guides by audience.
- Adopt: its clear statement of what each document type is for.

**Docusaurus / Starlight / MkDocs Material**
- Static docs-site generators used by many open-source projects.
- Overlap: Markdown in, themed HTML out.
- Difference: no writing method, audience rules, or verification model.
- Adopt: Fieldguide could target one of these as a render backend instead of building a renderer. Worth evaluating.

**Vale**
- A prose linter with configurable style rules.
- Overlap: enforcing writing rules, such as banned phrases in user guides.
- Difference: it checks style only, not structure or truth.
- Adopt: rules expressed as configurable, shareable packages. A candidate engine for the v1 linter.

**Mintlify and similar hosted, AI-assisted docs platforms**
- Commercial hosted docs, increasingly with AI writing features. Current feature set not confirmed.
- Overlap: AI-drafted, branded docs.
- Difference: hosted and commercial; as far as known, no claim-level verification record.

**Differentiator:** the verification model. Generators render whatever they're given, and AI writing tools generate plausible text. Fieldguide's distinct claim is that every published statement either has recorded evidence at the level the project chose, or isn't published. That, together with writing rules split by audience, is what readers of the guides would notice.

### Caveats & Pitfalls
- **Adoption:** developers who already run Docusaurus or Starlight may not add a second toolchain. If the renderer is mandatory rather than optional, adoption by other people likely stalls.
- **Adoption:** a reference repo that agents are pointed at assumes a local checkout and a writer who knows to point the agent there. That suits the author's own projects; for other people it may be a barrier until the packaged install exists.
- **Execution:** strict verification depends on each project's ability to run itself under automation. In Getwrite that needed throwaway user-data directories, port checks, and running outside the sandbox. Fieldguide can define the record, but can't make this generic, so the strict level may only work in well-tooled repos.
- **Execution:** readability formulas score sentence and word length, so product UI names (for example "Entity Relationship Graph") can inflate a page's grade even when the prose is plain. A reading-level target needs a way to account for them.
- **Execution:** "how to split a guide into pages" is a judgment call. Templates may produce rigid, padded structures unless the method allows pages to be dropped.
- **Assumption:** this assumes writers will keep a verification record up to date as the code changes. Without drift detection (v2), records may go stale silently.
- **Assumption:** the assumption that agents follow plain-Markdown instructions equally well across harnesses is untested. Expect differences between agents.

### Technical Considerations
- **Renderer posture:** worth deciding early whether to build the renderer or adapt an existing generator. The content contract should be the stable interface either way.
- **Schema versioning:** the page schema becomes a published contract (Getwrite's spec already treats its paths this way), so it needs explicit versioning from MVP.
- **Verification record as data:** a machine-readable record (rather than prose tables) makes coverage checks and drift detection possible.

### Open Questions
- What is the default target grade level, and what goes in the default banned and avoid lists?
- What do the MVP verification levels require exactly, and what are they called?
- How much branding goes in the config beyond tokens, and how does a project supply its tokens?
- Does Getwrite migrate to Fieldguide's schema, or does the schema adopt Getwrite's as-is?

### Next Steps
The concept is ready to spec. Expand it with **write-product-spec**; the remaining open questions can be carried into the spec as tracked questions.
