---
title: "Why 'All Verifications Passed' Still Breaks at Integration in Multi-Agent Systems"
subtitle: "Two reproductions, one blind spot, and a data-contract field"
date: 2026-01-30
tags: ["agentic-systems", "multi-agent", "verification", "data-contracts", "game-dev", "observability"]
series: ["vibegauge-narratives"]
translationKey: "verification-pass-integration-fail"
disclosure: "Engineering note. This is a case-based post with limited samples; conclusions focus on *detectable failure modes* and may not generalize."
---

In our multi-agent collaboration system, every upstream artifact is verified by
downstream agents. The event log looked perfect: every `VERIFY` was a pass. We
ran the process three times and it converged cleanly.

Then we stitched the artifacts from six agents together and ran the game.

It crashed immediately. The log had no obvious anomalies.

## TL;DR

- The verification protocol checked interfaces and local logic, not **data
  contracts** across producers/consumers.
- The event model carried **zero information** about return shapes/types, so no
  amount of offline analysis could infer contract mismatches.
- Adding a small, explicit **data contract table** (declared by the task
  designer) and writing `contract_check=pass|fail|not_checked` into the event
  stream made this class of failures visible *before* freeze.

<!--more-->

## The Problem

We studied a multi-agent ("Zone") platform where six agents each own a module
(physics engine, level data, player control, enemy behavior, game state, and
integration entry). They coordinate via a structured protocol:

1. `PRODUCE` - each agent produces its module
2. `VERIFY` - downstream agents verify upstream artifacts
3. `FREEZE` - the system freezes artifacts based on verification results

All coordination events are written into a shared event log. We analyze that
log in real time to compute health metrics and detect failure modes.

In two independent runs, we hit the same lethal pattern:

## Two Reproductions

### Run 1: Silent Failure (NaN Propagation)

Agent B implemented `loadLevel()`. During "normalization" it kept only the
flag's `{ x, y }` and dropped `width` and `height`.

Agent E's `checkWin()` used AABB collision detection and required
`flag.width/flag.height`. With `flag.width === undefined`, calculations like
`flag.x + flag.width` became `NaN`, and comparisons silently returned `false`.

Minimal shape of the bug:

```js
const right = flag.x + flag.width; // width is undefined -> NaN
const collides = player.x <= right; // comparisons with NaN are false
```

Result: the game ran, but could never be completed. No crash, no error.

### Run 2: Hard Failure (TypeError on Integration)

Agent E implemented `getDifficulty()` and returned an object:
`{ speedMultiplier: 1.0, senseMultiplier: 1.0 }`. From a design perspective,
this was reasonable and extensible.

Agent F's `game.html` treated the return value as a number and called
`difficulty.toFixed(1)` for display. Objects do not have `.toFixed()`.

Minimal shape of the bug:

```js
const difficulty = getDifficulty(); // returns an object
ui.textContent = difficulty.toFixed(1); // TypeError
```

Result: the page showed only the background; the game loop never started.

Across both runs, every `VERIFY` event in the log was `pass`.

This was not "lazy verification". Several reports were excellent: full source
included, multiple test cases, cross-checks, and explicit limitations (e.g.
"no Node.js here; static analysis only"). The technical claims in the reports
matched the code.

The problem was: they were verifying the wrong dimension.

## Root Cause: An Information-Theoretic Constraint

`VERIFY` was used as "interface compatibility": does the function exist? do the
parameters look right? does the logic seem reasonable?

But the failures lived in contract space:

- return value structure vs. consumer expectation
- property preservation across data pipelines

Both producers were "reasonable". Both consumers were "reasonable". Their
**implicit assumptions** about data shape diverged.

The deeper issue was in the event model:

- `PRODUCE` carried no type/shape information about return values
- `VERIFY` carried no structured record of what was checked vs. not checked
- the event log had **no signal** to support contract-level inference

So even perfect offline analysis could not infer whether `getDifficulty()`
"should" return a number or an object: that information never entered the
event stream.

We attempted an early detection rule (VERIFY graph structure completeness). In
a specially designed test run, it provably never triggered because the failure
it tried to detect had already been eliminated by engineering fixes. We
formally retired that rule and recorded the conclusion as `RULE_INEFFECTIVE`.

At that point, we had two options: declare this class of error "undetectable",
or change the event model itself.

## Fix: Add One Field to the Event Stream

The solution has two layers.

### Layer 1: Declare Data Contracts in the Task Definition

In the task description file, we added a "data contract" table authored by the
task designer (not by the agents) to declare cross-agent expectations:

```text
| Producer | Function / Interface | Consumer | Consumer expectation                          |
|----------|----------------------|----------|----------------------------------------------|
| Agent E  | getDifficulty()      | Agent F  | returns number (0.5~3.0), used by toFixed()  |
| Agent B  | loadLevel(n)         | Agent E  | includes flag.x, flag.y, flag.width, flag.height |
```

This gives verification an external reference.

### Layer 2: Log `contract_check` Explicitly

When a verifier performs contract checking, it annotates the `VERIFY` event
with:

- `contract_check: "pass"` - contract matches
- `contract_check: "fail"` - contract mismatch
- `contract_check: "not_checked"` - contract not checked in this verification
  (the verifier is not the consumer in the contract table)

This field is optional. A `VERIFY` event without it remains fully compatible
with older versions of the protocol. Freeze logic does not change:
`contract_check=fail` does not block freeze; it only triggers alerts.

During freeze, the system scans the event stream and generates two alert types:

| Alert type | Condition | Severity |
|-----------|-----------|----------|
| `CONTRACT_MISMATCH` | `contract_check = fail` | HIGH |
| `CONTRACT_NOT_CHECKED` | `contract_check = not_checked` | MEDIUM |

All alerts are written to two files (one machine-readable JSON, one human
readable Markdown) stored alongside the event log.

## Effect

We enabled the mechanism for the first time in Run 3. Same task, same role
allocation, same model. 68 events; three rounds; closed loop.

Event sequence number 29 recorded:

```text
seq 29: Agent F VERIFY Agent E  result=pass  contract_check=fail
```

Agent F checked the contract for `getDifficulty()` and found the return value
was an object rather than a number. This was exactly the bug that caused the
game to crash in earlier runs.

Under the old protocol, this event contained only `result: pass`. Engineers had
to manually integrate, run in a browser, witness the failure, then debug. The
event log carried zero useful signal.

Under the new protocol, the system generated an alert file:

```markdown
# Alerts

**4 alerts** (1 HIGH, 3 MEDIUM)

## HIGH -- Contract Mismatch

### seq 29: Agent E getDifficulty() → Agent F
- **Contract**: getDifficulty:number
- **Artifact**: game_state.js
- **Evidence**: verify_agent-e_round2.md

## MEDIUM -- Contract Not Checked

- Agent D (verifier: Agent B) -- VERIFY pass but contract not checked
- Agent C (verifier: Agent D) -- VERIFY pass but contract not checked
- Agent A (verifier: Agent C) -- VERIFY pass but contract not checked

## How to Act

HIGH alerts block release. Fix the data contract violation before shipping.
MEDIUM warnings suggest expanding VERIFY coverage in next run.
```

An engineer can resolve it in one screen:

1. **HIGH = do not ship.** `getDifficulty:number` points to the exact function
   and expected type. Open `game_state.js` and fix it.
2. **MEDIUM = coverage blind spots.** Three verifications passed but did not
   perform contract checks. Expand coverage in the next run.
3. **Evidence is traceable.** Open the referenced verification report and read
   the verifier's full reasoning.

Before vs. after:

| Dimension | Old (v0.1) | New (v0.2) |
|----------|------------|------------|
| getDifficulty type mismatch | **Invisible** - only `VERIFY: pass` | **Visible** - `contract_check=fail` + HIGH alert |
| When discovered | integration run crash | during `VERIFY` (before freeze) |
| Engineer action | integrate -> run -> crash -> debug | read alert -> locate function -> modify |
| Blind spot detection | none | 3 MEDIUM items mark "not checked" |

## Differences Between the Two Reproductions

Although the root cause mechanism is the same (contract mismatch + `VERIFY`
cannot see it), the surface behavior differs:

| Dimension | Run 1 | Run 2 |
|----------|-------|-------|
| Mismatch type | missing properties (flag lacks width/height) | wrong return type (object, not number) |
| Producer logic | "filter unknown fields while normalizing" (reasonable) | "return object for extensibility" (reasonable) |
| Consumer expectation | "collision needs width/height" (reasonable) | "display needs .toFixed()" (reasonable) |
| Game behavior | runs but can never win | fails to start |
| Error location | none (NaN propagates silently) | TypeError in constructor |

Run 1 is more insidious: the game looks normal, but can never be completed. No
errors, no crashes, just an always-false collision predicate.

## Limitations and Unresolved Issues

1. **Contracts are declared by humans.** The system does not automatically
   discover which function outputs are consumed by other agents. If the task
   designer omits a contract, that dimension reverts to invisibility.
2. **`contract_check=fail` does not block freeze.** This is deliberate (protocol
   compatibility and false-positive tolerance), but it means engineers can
   ignore HIGH alerts and still ship.
3. **Validated on one task type.** Evidence comes from a game development task.
   Other tasks (e.g. writing or trip planning) may have different failure
   modes.
4. **No "no-protocol" control group.** All runs used a structured protocol. We
   cannot fully separate intrinsic multi-agent failure modes from protocol
   design artifacts.
5. **Did the verifier really verify?** Verification report quality varied
   wildly. Some claims (like running tests) are hard to confirm.

## Open Question

Can agents discover data contracts themselves, instead of relying on humans to
declare them up front?

We observed that agents form implicit beliefs during verification (e.g. "I think
`getDifficulty()` should return a numeric coefficient"). If two agents disagree
(number vs. object), the disagreement itself is a signal.

The next mechanism we want to build is: agents log these implicit beliefs as
first-class events, then we automatically compare beliefs across agents,
flagging inconsistencies as "ambiguity" for human confirmation and eventual
contract formalization.

## Closing Thought

Not every `VERIFY: pass` means you are safe. Some failures happen not because
verification is careless, but because the verification protocol was never
designed to observe that dimension.

---

**Publishing note**: Technical blog | Redaction: publishable (internal
identifiers replaced with generic equivalents)

**Potential follow-ups**:

1. Auditing a verification protocol's resolution boundary: a coverage dimension
   matrix for multi-agent pipelines
2. Reducing contract maintenance cost: extracting contract candidates from
   agent "understanding" events
3. If `contract_check=fail` does not block freeze, should HIGH alerts block
   release? A progressive authority escalation strategy (WARN -> BLOCK)
