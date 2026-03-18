---
title: "Why an AI Keeps Rechecking the Door Lock"
subtitle: "Door-Lock Rechecking: one harmless repeat, one out-of-bounds contamination"
date: 2026-02-23
draft: true
tags: ["agentic-systems", "multi-agent", "reliability", "protocols", "observability", "engineering"]
translationKey: "door-lock-rechecking"
version: "v1.0"
disclosure: "Engineering note. This is a case-based post with limited samples; conclusions focus on *detectable failure modes* and may not generalize."
---

> Anchor: Door-Lock Rechecking — across independent runs, an LLM agent
> spontaneously re-submitted the same critical artifact, without being told to.

In a multi-agent system, we observed a behavior nobody explicitly taught:

After completing a **critical artifact**, the agent called the submission tool
again and re-submitted the same file. The content didn't change. The hash was
identical. Nothing in the prompt asked for a second submission.

After you leave home, have you ever stopped, turned around, and rechecked the
door lock?

This isn't about memory.

<!--more-->

## The Anchor

In three independent experiments (Run A, Run B, Run C), the chief agent (the
finalizer) submitted the same critical file twice:

| Run | First submission | Second submission | Content change? | Outcome |
|-----|------------------|-------------------|-----------------|---------|
| Run A | Submit #1 | Submit #2 | No (same hash) | OK |
| Run B | Submit #1 | Submit #2 | No (same hash) | OK |
| Run C | Submit #1 | Submit #2 | No (same hash) | OK |

This file was the **only required deliverable** for the run, determining
whether the audit would pass. Optional artifacts did not show the same repeated
submissions.

The prompt did not instruct "submit twice." The agent decided to "turn the
lock" again.

## Background

We operate a multi-agent collaboration system: multiple agents collaborate on a
shared task and exchange state via structured events. After the run ends, an
external audit reads the event log and decides whether the collaboration was
successful.

One core tool in the system is a submission action: when an agent finishes, it
calls the tool to declare "this file is my output." The system records the
content fingerprint (hash) and a timestamp to build an auditable evidence
chain.

Three design principles guide the system:

```text
World rules (configurable)     → A run has time boundaries; only in-bound submissions count
Collaboration infrastructure   → Submission tool exists; agents can call it freely
Implementation (not prescribed)→ We don't tell agents when to call it, or how many times
```

The outer loop provides rules and tools. It does not micro-manage how agents do
their work.

## What We Found

### Repeated submission, unchanged content

In 3/3 runs, the chief agent submitted the critical file twice before the run
ended, with identical hashes. This was not "edit then re-submit." It was "no
change, submit again."

One interpretation (human narrative; not a causal claim) is that the agent
sensed the high stakes of the artifact and chose to recheck. Like a human
turning the door lock again: the higher the cost of failure, the stronger the
urge to confirm.

An equally plausible interpretation is that in a long, stochastic session, the
extra tool call is just a probabilistic event. No intent is required.

Engineering-wise, the interpretation doesn't matter.

### Run A exposed the real issue: an out-of-bounds third submission

In Run A, we observed a third submission. This one happened **after** the run
was officially closed, and the content changed (different hash):

```text
Before close: two submissions of the critical file (same hash)
Run close: the system declares the run is done
After close: the chief submits the same file again (different hash)
```

In the door-lock metaphor: you already left home, then came back and changed
the lock.

The audit detected a new version of the same artifact being submitted after the
close boundary, flagged evidence-chain contamination, and the run failed
(score=0).

By contrast, Run B and Run C repeated submissions happened before close and did
not change content, so the audit passed (score=100).

## The Engineering Decision

There are two directions you can take:

**Direction 1 (not recommended):** tell the agent in the prompt "only submit
once" or "don't touch it after submission."

That's shifting design burden onto the agent. In a complex session, the agent
already has to manage task logic, protocol constraints, and timing boundaries.
Adding another "don't do X" rule increases cognitive load. And repeated
submissions are not a problem when the content is identical.

**Direction 2 (recommended):** make the infrastructure carry the burden.

Two guardrails do it:

- **Idempotent dedup** (for repeated submissions with identical hashes): the
  tool checks whether the same content has already been recorded and silently
  skips.
- **Boundary blocking** (for post-close submissions): after the run is closed,
  the tool rejects new writes and emits a warning event.

The shared principle: engineering decisions should not depend on attributing
LLM behavior. Whether the repeat is "emergent confirmation" or "random noise,"
the correct infrastructure response is the same.

One line: let the lock tolerate being turned repeatedly; don't teach people not
to turn it.

## Evidence (desensitized)

| Run | Outcome | Submissions of the critical file | Content change? | Last submit vs close |
|-----|---------|----------------------------------|-----------------|----------------------|
| Run A | score=0 | 3 | 3rd differs | 3rd after close |
| Run B | score=100 | 2 | same | all before close |
| Run C | score=100 | 2 | same | all before close |

The control logic is precise: the failure in Run A is attributable to the
post-close, different-hash submission, not to the harmless repeated submission.

A layered diagnosis (outside-in priority):

| Layer | Check | Conclusion |
|-------|-------|------------|
| Rule delivery | Were critical constraints missing? | Not root cause |
| Timing | Was the close boundary incorrect? | Not root cause |
| Protocol | Is the protocol itself flawed? | Not root cause |
| **Infrastructure** | **Does the submission tool enforce boundaries?** | **Root cause: no post-close block; no idempotent dedup** |
| Configuration | Misconfiguration? | Not root cause |
| Model behavior | Not needed | — |

## Why This Matters

There's a common engineering trap in LLM applications: when we observe an
unexpected model behavior, our first reaction is to "fix the model" with prompt
instructions.

Sometimes that's right. Often it:

1. Increases cognitive load (more rules to remember)
2. Makes the system depend on model self-discipline instead of infrastructure
3. Treats behavior data as a bug instead of an input signal for guardrails

"Let the lock tolerate repeated turning" gives a decision frame:

- If the behavior is harmless → make it idempotent
- If the behavior is harmful only after a boundary → enforce the boundary in tools
- If attribution is uncertain → design guardrails that work either way

## Limitations and Open Questions

### Limitations

1. **Sample size:** 3/3 showed repeated submissions, but n=3 is too small to
   separate a systematic pattern from a configuration-specific effect.
2. **Attribution is not provable:** the event log cannot tell us why the agent
   repeated the submission. The lock metaphor is narrative, not a mechanism
   claim.
3. **Single task class:** all runs used the same configuration and a similar
   class of structured-analysis tasks.
4. **Guardrails not yet validated:** idempotent dedup and boundary blocking
   were design proposals at the time of writing; implementation and regression
   validation are pending.

### Open questions

1. **Is repetition correlated with "importance"?** If it happens only for
   required artifacts, does task structure influence it?
2. **Where is the boundary of idempotence?** If the agent submits different
   hashes multiple times within bounds, how do we distinguish normal iteration
   from drift?
3. **Is it consistent across providers?** Do different providers show
   different repetition rates (a proxy for risk preference)?

---

*Desensitization: run identifiers are generic; internal fields and
implementation details are omitted.*

*Epistemic note: the door-lock analogy is a human narrative frame, not a claim
about internal model mechanisms. In this post, "emergent" only means the
behavior appeared without an explicit instruction; it does not imply intent or
consciousness.*

