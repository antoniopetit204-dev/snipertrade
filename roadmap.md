# Tasks
- [x] Replace trading-related wording across outgoing emails; preserve sender addresses and working links.
- [x] Strengthen email delivery safeguards: encrypted SMTP, bounded sends, invalid-mailbox suppression, working one-click unsubscribe, and security codes for manual sends; five tests passed.
- [x] Deploy the email changes and verify available signals: saved templates contain no trading words, unauthorized sends are rejected, and unsubscribe requires POST.
- Inbox placement remains unverified: confirmation requires a real recipient's message headers and inbox/spam result.