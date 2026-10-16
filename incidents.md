# Incidents

One entry per production bug or revert. Each one should end with a rule in `REVIEW.md`.

## 2026-10-15: Besales told "not a client" when 1C was down

- What broke: people without cached data were reported to Besales as non-clients, and Besales cleared their purchase details.
- Cause: a slow or unreachable 1C call was read as "no client found".
- How found: Besales reported wrong client data.
- Fix: 2.21.0, the bot leaves the fields out when 1C fails.
- Rule added: REVIEW.md, "1C slow or unreachable is treated as an answer".

## 2026-10-15: group messages forwarded to Besales as private chats

- What broke: messages from the ASLZAR group went to the Besales agent. Replies went to private chats of people who never started the bot, causing "user not started" failures.
- Cause: the bot is a group admin and its handler did not check the chat type.
- How found: Besales reported "user not started" errors.
- Fix: 2.21.0, only private chats are forwarded.
- Rule added: REVIEW.md, "The bot treats a group or channel message as a private chat".

<!--
## YYYY-MM-DD: short title
- What broke: what users saw
- Cause: file and line, what the code did
- How found: user report, logs, monitoring
- Fix: version or PR
- Rule added: the REVIEW.md line, or why none
-->
