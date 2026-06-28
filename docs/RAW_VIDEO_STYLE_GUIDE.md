# RawVideoStyleGuide

Last updated: 2026-06-28

## Purpose

RawVideoStyleGuide defines the first quality standard for `raw_video_edit`.

It is the shared reference for:

- AI Options recommendation
- EDL generation and validation
- clip-card manual review
- FFmpeg clean edit acceptance
- Remotion packaging templates
- final human acceptance

The first version is intentionally focused on P0: knowledge talking-head videos recorded by John or by a similar solo creator.

## P0 Boundary

P0 supports:

- 1-5 minute source videos, with a hard first-stage limit of 15 minutes.
- one primary speaker.
- one continuous knowledge-delivery context per job.
- knowledge talking-head, course clip, and simple product demo videos.
- one source video per job.
- clean edit, readable subtitles, lightweight packaging, cover, metadata, transcript, EDL, and compliance report.
- local-first rendering and review on John's machine.

P0 does not support:

- multi-camera editing.
- complex multi-asset montage.
- frequent shot replacement driven by external stock assets.
- professional timeline editing.
- automatic publishing to platforms.
- cloud batch rendering.
- commercial music intelligence.
- AE-level free composition.

## Boundary Rules

The raw-video P0 line exists to solve one concrete problem:

- John records one knowledge-focused video.
- video-ops converts that source into a publishable short-form output package.
- The system can explain what it cut, why it cut it, and how the final package was produced.

P0 should reject or defer these cases instead of pretending to support them:

- videos longer than 15 minutes in the first release.
- more than one dominant speaker in the same source.
- videos that rely on external b-roll as the main storytelling layer.
- videos that require frame-accurate manual timeline design.
- workflows that expect one click to publish to social platforms.
- workflows that expect cloud SaaS batch rendering in this phase.

This boundary is intentionally conservative:

- It keeps `raw_video_edit` auditable.
- It avoids fake AI editing claims that cannot be traced to media analysis.
- It gives M1-M6 a stable product target before broader scenarios are added.

## Target Samples

### Target Sample 1: Clean Knowledge Talking Head

Use case: John records a direct-to-camera explanation about AI tooling, engineering management, training science, or nutrition.

Expected result:

- The message stays logically complete after trimming.
- Long pauses, obvious restarts, and repeated filler phrases are removed.
- Subtitle rhythm follows spoken meaning, not arbitrary fixed line length.
- Title bar appears only when it helps the viewer understand the segment.
- CTA is restrained and appears near the end.
- The visual layer feels like a polished creator account, not a loud template demo.

Acceptance focus:

- The viewer can understand the point without seeing the original raw video.
- The edit does not make John sound rushed or chopped.
- The final video can be posted without opening PR, AE, or Jianying for basic cleanup.

### Target Sample 2: Course Clip

Use case: A short excerpt from a longer lesson, workshop, screen-share, or internal explanation.

Expected result:

- The final clip has a clear topic boundary.
- The opening includes enough context so the clip does not feel cut from the middle.
- Chapter card or progress marker can be used when the clip has two or more conceptual sections.
- Subtitles remain readable over slides or screen content.
- Cropping preserves the speaker or key screen area.

Acceptance focus:

- The clip has a complete learning unit.
- Important slide/screen content is not covered by subtitles or overlays.
- The cut points do not remove necessary context.

### Target Sample 3: Product Demo

Use case: John demonstrates a product workflow, a local tool, ContentOps, video-ops, or an AI coding pattern.

Expected result:

- The viewer can follow what changed on screen.
- Important UI areas are not blocked by captions or title bars.
- Zoom or highlight overlays are allowed only when they clarify a concrete action.
- Dead waiting time is removed unless the wait is part of the teaching point.
- The final metadata explains the platform and intended audience.

Acceptance focus:

- The demo remains technically truthful.
- The viewer can reproduce the key action.
- Visual emphasis supports the product action rather than decorating the video.

## Anti-Example

Unacceptable output:

- The edit deletes context and leaves sentence fragments.
- The speaker sounds unnaturally chopped because every small pause is removed.
- Subtitles cover the mouth, face, hands, or key screen area.
- Title bars and CTA appear too often and compete with the spoken content.
- The hook becomes exaggerated or misleading.
- The final video has no clear reason for each removed segment.
- The output package lacks transcript, EDL, metadata, or compliance evidence.

Why it fails:

- It may look "edited", but it is not trustworthy or publishable.
- The system cannot explain why it removed or kept each segment.
- John would still need to reopen a manual editor before publishing.

## Subtitle Standards

Subtitles must:

- stay inside platform safe areas.
- avoid covering faces, hands, product UI, or key slide content.
- use meaning-based line breaks.
- prefer 8-18 Chinese characters per line for fast short-video reading.
- avoid more than two lines at once in P0.
- preserve technical terms from the creator glossary.
- keep timestamps tied to Whisper or verified media analysis, not invented by the LLM.

Subtitles should not:

- rewrite the speaker into a different meaning.
- overuse keyword highlights.
- flash too quickly to read.
- look like a karaoke template unless explicitly selected later.

## Packaging Standards

Packaging must:

- keep John as a calm, credible personal IP creator.
- use title bars, chapter cards, and CTA only when they serve comprehension.
- keep one consistent visual language per output.
- write template version and selected profile into metadata.
- make platform intent visible in output metadata.

Packaging should not:

- imitate viral short-video noise by default.
- add decorative overlays without a content function.
- hide weak editing behind animation.
- create a different brand voice from ContentOps and John IP positioning.

## Editing Standards

Clean edit must:

- remove long pauses, obvious restarts, duplicated sentences, and irrelevant side comments.
- preserve semantic continuity.
- keep each removed clip traceable to transcript timecodes and a deletion reason.
- prefer conservative edits when confidence is low.
- allow the user to restore deleted clips before final render.
- keep audio loudness stable across the full output.

Clean edit must not:

- use LLM-generated timecodes.
- delete a segment only because the sentence is slow.
- create overlaps, negative durations, or out-of-bound clips.
- hide removed context from the user.

## Manual Acceptance Checklist

Use this checklist when John reviews a raw-video output:

- [ ] The main idea is still complete after trimming.
- [ ] The first 3-5 seconds make the video worth continuing.
- [ ] Cuts sound natural and do not make the speaker feel rushed.
- [ ] Subtitles are readable and do not cover key visual areas.
- [ ] Packaging feels like John IP, not a generic template.
- [ ] CTA is present only when it helps the content.
- [ ] Output package includes MP4, cover, metadata, transcript, EDL, and compliance evidence.
- [ ] The result is publishable without opening a manual editor for basic cleanup.

## How Later Issues Should Use This Guide

- `VIDEO-RAW-M1`: use the P0 boundary to validate upload limits and job directory structure.
- `VIDEO-RAW-M2`: use subtitle standards and glossary expectations for transcript output.
- `VIDEO-RAW-M3`: use editing standards to define Options and EDL validation.
- `VIDEO-RAW-M4`: use clean edit standards to validate FFmpeg output.
- `VIDEO-RAW-M5`: use packaging standards for Remotion template decisions.
- `VIDEO-RAW-M6`: use the manual acceptance checklist as the final quality gate.
