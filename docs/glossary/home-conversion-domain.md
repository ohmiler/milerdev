# Home conversion domain and section glossary

- Status: Accepted living document
- Last updated: 2026-08-19
- Related decision: `docs/adr/0002-home-information-architecture-and-spacing-rhythm.md`

## Journey model

```mermaid
flowchart LR
    Visitor[Visitor] --> Promise[Understands the promise]
    Promise --> Confidence[Confirms product capabilities]
    Confidence --> Outcome[Recognizes the learning outcomes]
    Outcome --> Product[Evaluates a published course]
    Product --> Authority[Finds teaching proof]
    Authority --> Objections[Resolves objections]
    Objections --> Action[Browses, previews, or registers]
```

Home supports this journey; it does not need to explain every product detail that belongs on a course page.

## Section roles

### Hero promise

The fastest explanation of who MilerDev is for, what practical change the learner can expect, and the next useful action. It is not a complete company introduction.

### Confidence strip

A compact list of confirmed product capabilities that reduce uncertainty: Thai explanations, saved progress, lifetime review access, and certificate eligibility. Capability claims must remain true for the actual learning product and must not be presented as social-proof statistics.

### Learning outcome

A concrete direction for learner growth. The current Home uses เข้าใจเหตุผล, สร้างด้วยตัวเอง, and ต่อยอดเป็นผลงาน. Outcomes are appropriate while the catalog is too small to support distinct learning-path destinations.

### Learning path

A real route through available products for a learner goal. A learning-path card must lead to a meaningful filtered catalog, bundle, or path-detail state. A label that sends every learner to the same generic catalog is a marketing topic, not a product path.

### Latest product

One of the four most recently created published courses returned by the authoritative Home query. Cards use real price, active promotion, preview, instructor, lesson, duration, and tag data. Latest is not the same as manually featured.

### Studio proof

Evidence that connects MilerDev Studio's teaching approach and software experience to real teaching activity. The current proof is a static three-image collage with descriptive alternative text; it is not a gallery product or testimonial.

### Learner outcome proof

A verified review, learner project, or case study that shows a result attributable to an actual learner. Anonymous invented testimonial copy is not learner outcome proof. Home omits this role until verifiable assets exist.

### Canonical FAQ

The shared pre-purchase answer set used by Home and the full FAQ page. Home currently admits five questions covering prerequisites, access duration, certificates, payment methods, and access after payment.

### Objection

A reason a suitable visitor may delay action, such as missing prerequisites, uncertainty about access duration, payment methods, certificates, preview availability, or support.

### Final action

The single most useful next step after the page has established fit and trust. For the current MilerDev release this is browsing courses; registration is secondary.

## Spacing language

### Section block spacing

The vertical breathing room between a section boundary and its content. It defines page rhythm and must not be confused with gaps between child elements.

### Section header gap

The distance between the section's heading and copy cluster and its primary cards, media, or controls.

### Content gap

The repeatable distance between sibling cards or content groups inside a section.

### Page gutter

The minimum horizontal space between viewport edges and readable content. The shared container owns only this inline spacing; sections own their block spacing.

### Compact evidence strip

A deliberately short section used for concise, credible capabilities or evidence. It is not permission to collapse typography, tap targets, or mobile gutters.

## Invariants

- Do not show fabricated, ambiguous, or capped-query statistics as social proof.
- Do not publish a learning path without a real destination.
- Do not invent reviews, projects, partners, or instructor claims.
- Home CTAs must resolve to an existing truthful flow.
- Fix spacing at the cascade and token level before applying local exceptions.
- Mobile spacing may be smaller than desktop spacing, but it must remain intentional and measurable.
- The shared container must not reset vertical padding utilities.
