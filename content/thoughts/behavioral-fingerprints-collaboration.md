---
title: "54 Multi-Agent Runs Under One Fixed Protocol: Behavioral Fingerprints and a Coordination Blind Spot"
subtitle: "Protocol compliance, failure modes, and why observability depth matters"
date: 2026-02-18
draft: false
tags: ["agentic-systems", "multi-agent", "observability", "protocols", "governance"]
translationKey: "behavioral-fingerprints-collaboration"
version: "v1.0"
disclosure: "Engineering note. This is a case-based post with limited samples; conclusions focus on *detectable failure modes* and may not generalize."
---

> Engineering note: this post is based on limited samples and is focused on
> *detectable failure modes*, not benchmark rankings.

Different LLMs don't just perform differently. Under the same multi-agent
protocol constraints, they *collaborate* differently.

We ran 54 multi-agent sessions across 4 provider configurations under identical
protocol constraints. The behavioral fingerprints were reproducible and
revealed that protocol compliance (emitting the right signals in the right
order) is a major differentiator in agentic settings.

<!--more-->

## The Setup

We operate a multi-agent collaboration platform where 8 LLM-powered agents work
together on a shared task under a structured protocol. The protocol defines a
3-round lifecycle:

- **Round 1**: Chief produces a plan, workers self-assign scope
- **Round 2**: Workers implement, chief monitors
- **Round 3**: Chief reviews, produces final artifacts, closes

Every agent interaction is captured as a structured event in a shared event
log. A governance audit stack scores each run on protocol compliance, evidence
chain integrity, and artifact provenance.

Over 4 days of intensive experimentation, we accumulated 54 runs across 4 LLM
provider configurations, all running the same protocol, the same task structure
and the same governance rules. The primary variable is the model/provider
configuration.

## Finding 1: Behavioral Fingerprints Are Real and Reproducible

Each provider develops a characteristic behavioral signature across runs. These
aren't anecdotal. They're reproducible across sample sizes of 6-24 runs per
provider (though we acknowledge the samples are small).

### Protocol Compliance Rates by Provider

| Metric | Provider A (n=24) | Provider B (n=16) | Provider C (n=8) | Provider D (n=6) |
|--------|:---------:|:-----------:|:----------:|:---------:|
| Plan Proposal Rate | 95.8% | 93.8% | 75.0% | 66.7% |
| Self-Assign Rate | 95.8% | 87.5% | 62.5% | 50.0% |
| Review Trigger Rate | 70.8% | 56.2% | 25.0% | 50.0% |
| Chief Closure Rate | 70.8% | 56.2% | 25.0% | 50.0% |
| **Full Protocol Pass** | **54.2%** | **31.2%** | **12.5%** | **16.7%** |

*Providers A-D are four distinct model/provider configurations. Names are
omitted to keep the focus on protocol behavior rather than vendor comparison.
These are exploratory observations under our specific protocol, not benchmark
rankings. See Limitations for important caveats.*

The gradient is striking: Provider A completes the plan-assign-review-close
chain in about 71% of runs. Provider C completes it 25% of the time. Provider D
started at 0% before prompt intervention.

These aren't capability gaps. All four providers can write code, reason about
tasks, and follow instructions. The gap is in **protocol compliance under
multi-agent coordination pressure**: emitting the right signals in the right
order while other agents are concurrently acting.

### Average Behavioral Volume

| Metric | Prov. A | Prov. B | Prov. C | Prov. D |
|--------|:-------:|:-------:|:-------:|:-------:|
| Avg Events per Run | 193 | 155 | 119 | 152 |
| Avg Artifacts Produced | 7.8 | 6.9 | 3.6 | 6.2 |

Provider A produces 2x the artifacts of Provider C in the same protocol window.
Not because it's smarter, but because it spends less time deliberating about
the protocol and more time following it.

## Finding 2: The Great Compliance Divergence

Conceptually related work on behavioral fingerprinting suggests that core
capabilities may converge among top models while behavior still diverges. Their
fingerprinting uses static diagnostic prompts; ours is based on multi-agent
collaboration traces under a fixed protocol.

In our data, the divergence isn't about alignment in the RLHF sense. It's about
**agentic compliance**: the willingness to emit structured protocol signals
(plan proposals, assignments, review triggers) instead of just doing work.

We see three distinct behavioral archetypes:

### The Protocol Follower (Provider A)

- Emits plan proposals immediately
- Workers self-assign within seconds of plan publication
- Chief closes the evidence chain reliably
- Weakness: lower governance sophistication (fewer friction/policy events)

### The Deliberator (Provider C)

- High governance event density (27 governance events vs Provider A's 7 in
  comparable runs)
- Produces friction observations, policy proposals, policy reviews
- But often stalls: spends so long deliberating that the chain never closes
- The largest model variant in particular over-reasons about protocol semantics
  instead of executing

### The Explorer (Provider D)

- Default behavior: read everything before acting
- In a limited tool-call budget, spends 100% on file reads and searches: zero
  protocol signals
- Only 67% of runs produce a plan proposal at all
- But: highly responsive to prompt structure (see Finding 3)

## Finding 3: Behavior Is Not Personality. It's a Function of Prompt Structure

The most actionable finding: what looks like a fixed personality is often a
tunable response to prompt structure.

### A Case Study in Prompt Intervention

One provider as chief (the planning role) initially failed every run we
attempted. Tool-call-level telemetry showed why.

**Before intervention (21 tool calls in a session):**

The agent spent 57% of calls reading files, 19% exploring directory structure,
and 10% searching, with zero writes and zero protocol signal emissions. It
understood the task by exploring, but never transitioned to acting.

**The intervention: 5 lines of prompt restructuring**

```text
Step 2 (IMMEDIATE — before reading any other files):
  a) Read ONLY the task spec and acceptance criteria
  b) Write your plan document
  c) Emit the plan-proposal signal
  Do NOT explore the workspace until the plan is emitted.
```

**After intervention (7 tool calls):**

The agent read two spec files, wrote the plan, and emitted the required
signals. Tool calls dropped from 21 to 7. In this before/after comparison, the
chief went from zero protocol signals to completing the full plan-proposal
chain. (Caveat: initial observation was n=1, confirmed in subsequent runs.)

### The Implication

When you see a model failing at agentic tasks, the diagnosis shouldn't be "this
model can't do it." The diagnosis should be: "under what prompt structure does
this model comply?"

Our behavioral fingerprints aren't fixed properties. They're baseline
measurements that tell you how much prompt engineering each provider needs to
achieve protocol compliance. Provider A needs almost none. Provider D needs
explicit action-before-exploration instructions. Provider C needs brevity
constraints to prevent deliberation stalls.

## Finding 4: Failure Modes Are More Informative Than Success

Across 54 runs, we classified every non-passing run by failure mode:

| Failure Mode | Count | Description |
|-------------|-------|-------------|
| Coordination Stall | 19 | Agents active but chain never completes |
| Coordination Failure | 12 | Chain breaks at a specific signal |
| Clean (no failure class) | 8 | Run completed but didn't achieve full pass |
| Meta-Governance Gap | 6 | Friction detected but no policy response |
| Artifact Missing | 4 | Protocol completes but deliverable absent |
| Path Contract Drift | 3 | Declared artifact path does not match actual path |
| Control Plane Dropout | 2 | Agent silently disappears |

The dominant failure mode, coordination stall, is not a crash. It's the
multi-agent equivalent of a meeting where everyone is engaged but nothing gets
decided. Agents are active, producing events and doing work, but the required
chain of signals (plan -> assign -> review -> close) never completes.

This is invisible to traditional observability tools that track latency,
errors, and costs. An agent that explores for 21 tool calls looks healthy in a
dashboard. You need protocol-aware behavioral analysis to see that it's stuck.

The single most common critical trigger was **missing chain closure signal** (20
occurrences across 54 runs). The chief fails to close the evidence chain, not
because it crashed, but because it ran out of context, deliberated too long, or
explored instead of acting.

## Finding 5: Telemetry Depth Determines Diagnostic Speed

During one provider's debugging process, we spent 3 consecutive runs unable to
diagnose why the chief was failing. The event log showed "plan proposal
missing", but not why. Tool event logs recorded the call name and result code.
We knew calls were happening, but not what they contained.

Adding a single field, a summary of each tool call's content (first line,
truncated to 200 characters), immediately revealed the root cause: 100%
exploration, zero protocol actions.

Lesson: the resolution of your telemetry determines how fast you can diagnose
behavioral failures. Event-level (what happened) is necessary. Tool-call-level
(what was the agent actually doing) is what makes diagnosis fast.

## Methodology and Limitations

### What We Measure

Each run produces:

- **Event log**: complete structured event stream (50-350 events per run)
- **Behavioral profile**: fingerprint including score, governance metrics, chain
  latency, workload distribution
- **Audit report**: 40+ checks across evidence chain, protocol compliance,
  artifact provenance
- **Real-time monitor**: continuous assessment with severity classification

### Limitations (Honest)

1. **Single protocol**: all 54 runs use the same 3-round collaborative
   protocol. We don't know if these fingerprints hold under different
   protocols.
2. **Compressed timeline**: all 54 runs were conducted over 4 days. This is
   intensive but short. We don't know if patterns are stable over longer
   periods or different conditions.
3. **Self-designed scoring**: the governance scoring system was designed by us.
   There's no external calibration or benchmark comparison.
4. **Small samples for some providers**: Provider D has only 6 runs. Provider C
   has 8. Statistical significance is limited.
5. **No controlled ablation for confounders**: duration, time-of-day, API load,
   and prompt version all varied. We controlled for protocol and provider, not
   everything else.
6. **One project, one person**: this is a solo research effort with LLM
   assistance, not a peer-reviewed study.

### Future Work

A key open question is whether these behavioral fingerprints are intrinsic to
the models, or amplified by multi-agent coordination pressure. A practical next
step is a minimal ablation: keep the same protocol and scoring, but run a
single-agent (or single-chief) configuration and measure whether the same
plan/assign/review/close patterns persist.

### What We're Not Claiming

We are not claiming that any provider is better at agentic tasks in general. We
are claiming that under this specific protocol, these providers exhibit
reproducibly different behavioral patterns, and that understanding these
patterns is more useful than aggregate benchmarks for anyone building
multi-agent systems.

## So What?

If you're building multi-agent systems, three things follow from this data:

1. Benchmark agentic behavior, not just capability. A model that scores well on
   classic coding benchmarks may stall in multi-agent coordination. Protocol
   compliance is a separate axis from reasoning ability.
2. Invest in behavioral telemetry early. Event-level logging of protocol
   signals is cheap. The cost of not having it is weeks of guessing why agents
   aren't coordinating.
3. Don't write off a model as "can't do agents." What looks like a capability
   limitation is often a prompt structure mismatch. In this case study, a
   5-line prompt restructuring transformed the chief from pure exploration to
   completing the full protocol chain. The behavioral fingerprint tells you
   what to fix, not what to abandon.

---

*This analysis is based on 54 multi-agent runs across 4 LLM provider
configurations, conducted in February 2026. Methodology details and
desensitized summary statistics are available on request.*

*Conceptually related work: Behavioral Fingerprinting of Large Language Models
(Rauba et al., 2025). Their approach uses static diagnostic prompts; ours comes
from multi-agent collaboration traces under a fixed protocol:
https://arxiv.org/html/2509.04504v1*
