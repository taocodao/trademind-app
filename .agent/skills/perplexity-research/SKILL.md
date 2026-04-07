---
name: perplexity-research
description: >
  Rule: Whenever there is uncertainty, ambiguity, or a knowledge gap about
  an API, library behavior, service config, or external system — STOP and
  prepare a focused Perplexity question instead of guessing and iterating.
  Apply this BEFORE writing any code that depends on the answer.
---

# Perplexity Research Rule

## When to Trigger This Skill

You MUST prepare a Perplexity question (instead of guessing) when:

1. **API / SDK behavior is unclear** — e.g., Composio OAuth flow, Vercel env
   variable scoping, Prisma schema behavior, Next.js routing edge cases
2. **Third-party service rules are involved** — e.g., Resend email format
   requirements, Stripe webhook signature, Composio auth config IDs
3. **A fix has been tried more than once and still fails** — stop iterating;
   the root cause requires verified knowledge
4. **"I think" or "I believe" or "probably" appears in your reasoning** — these
   are signals that you don't actually know
5. **External format / schema is assumed** — e.g., Composio callback payload
   structure, Vercel function timeout limits, Privy user ID format

## When NOT to Trigger

- Straightforward code logic with no external dependencies
- Fixing a clear syntax / type error
- Applying a pattern already confirmed in the codebase

## How to Write the Question

Structure every Perplexity question in three parts:

```
## Context
[2-3 sentences describing the system, library version, and what you're trying to do]

## Specific Question
[The exact technical question — be precise about versions, environments, error codes]

## What You've Already Tried
[What approach was used and what happened — include exact error messages]
```

## After Getting the Answer

1. Confirm the answer changes the approach before writing code
2. Document the confirmed behavior in a comment near the relevant code
3. If the answer reveals a prior fix was wrong, revert the wrong fix FIRST,
   then apply the correct one

## Template (copy-paste)

```
## Context
[system / library / environment]

## Specific Question
[precise technical question with version numbers, error codes, field names]

## What You've Already Tried
[approach taken + exact error message / unexpected behavior observed]
```
