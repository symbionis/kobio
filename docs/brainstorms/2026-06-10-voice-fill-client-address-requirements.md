---
date: 2026-06-10
topic: voice-fill-client-address
---

# Voice-fill client address

## Summary

Add a "Dicter" action to the new-client modal that records a short voice note, transcribes it, and fills the address block — Nom, Adresse, NPA, Ville, Pays — for the builder to review. Voice-filled fields are highlighted until edited. E-mail and phone stay typed, and nothing is created until the builder taps "Créer le client."

## Problem Frame

Kobio is voice-first on site, but creating a client is still all typing — a builder standing at a job has to thumb a name, street, postcode, town, and country into a modal on a phone. That is the slowest part of the create flow and the one most exposed to mobile typing friction. The capture-by-voice pattern the app already uses for quotes maps cleanly onto the address block, where street and town names dictate far more reliably than they type.

## Key Decisions

- **Address block only.** Voice fills Nom / Adresse / NPA / Ville / Pays. E-mail and phone stay typed — they transcribe poorly when read aloud ("arobase", digit runs, homophones) and are the costliest fields to get wrong.
- **Highlight, not confidence scoring.** Voice-filled fields get a review highlight rather than a per-field confidence model — cheaper to build, and a five-field form is short enough to eyeball before creating.
- **Never auto-create.** Dictation only populates editable fields; the builder confirms spelling and taps "Créer le client." This honors the project rule that a contact is never auto-created from a transcribed name.
- **Leave blank when unsure.** Faithful capture over helpful guessing — a field the model did not clearly hear stays empty rather than being filled with a best guess.
- **Replace on re-record.** A new recording overwrites the address-block fields rather than merging, so re-dictation is predictable; typed e-mail/phone are never touched.

## Requirements

**Capture**

- R1. The new-client modal offers a voice action ("Dicter") that records a note and stops on a second tap.

**Extraction and fill**

- R2. After recording, the note is transcribed and the address block is extracted: Nom, Adresse, NPA, Ville, Pays.
- R3. Extracted values populate the matching editable fields, each of which the builder can still edit.
- R4. A field the model did not clearly hear is left blank — never guessed.
- R5. A spoken country is mapped to the existing country list; a country outside that list leaves Pays blank.
- R6. E-mail and phone are not populated by voice; they remain typed.

**Review and creation**

- R7. Each field populated by the dictation is visually highlighted; the highlight clears when that field is edited.
- R8. Re-recording replaces the address-block fields with the new dictation and re-applies the highlights, leaving any typed e-mail/phone untouched.
- R9. No client is created from the dictation; creation still requires the builder to tap "Créer le client."
- R10. When transcription or extraction is unavailable or yields nothing, the form is left unchanged and the builder is told to enter the details manually.

## Key Flows

- F1. Dictate a new client (happy path)
  - **Trigger:** Builder opens the new-client modal and taps Dicter.
  - **Steps:** Record → stop → transcribe → extract the address block → fields fill and highlight → builder reviews and edits → taps Créer.
  - **Covered by:** R1, R2, R3, R7, R9
- F2. Partial or unheard fields
  - **Trigger:** The dictation omits or garbles a field (e.g. no postcode spoken).
  - **Steps:** Heard fields fill and highlight; unheard fields stay blank and unhighlighted; builder types the rest, then creates.
  - **Covered by:** R4, R5, R7

## Acceptance Examples

- AE1. **Covers R4, R7.** Given a note with no NPA spoken, When extraction completes, Then NPA is blank and unhighlighted while Ville (spoken) is filled and highlighted.
- AE2. **Covers R7.** Given Ville was voice-filled and highlighted, When the builder edits Ville, Then its highlight clears.
- AE3. **Covers R8.** Given the builder already dictated once and typed a phone number, When they record again, Then the address fields are replaced and re-highlighted and the typed phone is unchanged.
- AE4. **Covers R5.** Given the spoken country is "Portugal", Then Pays is set to the matching list entry; given a country not in the list, Then Pays is left blank.
- AE5. **Covers R10.** Given transcription is unavailable, When the builder taps Dicter, Then the fields are unchanged and a message tells them to enter the details manually.

## Scope Boundaries

Deferred for later:

- Voice capture of e-mail and phone.
- Dictating into an existing client on the detail page — this brief is the create-modal flow only.
- A conversational clarification loop — the form stays a form, not a back-and-forth.

## Dependencies / Assumptions

- Reuses the existing OpenRouter STT + structured-extraction pipeline in `src/llm/` and the recorder affordances already on `app/new/page.tsx`; phone and country normalization already exist (`src/phone.ts`, the country list).
- Dictation is in French (the configured STT language).
- Behaves gracefully without `OPENROUTER_API_KEY`, mirroring the quote flow's keyless fallback.

## Outstanding Questions

Deferred to planning:

- Whether to add a dedicated transcription endpoint or generalize the existing `app/api/quote/route.ts` to also serve contact extraction.
- How much of the `/new` capture UX to reuse (waveform, timer, screen wake lock) versus a lighter inline recorder for a ~10-second note.
