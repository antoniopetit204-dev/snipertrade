# Architecture rules
- All outbound email passes through auth-email and the shared email-policy module, so account-focused copy, header validation, and bounded sending apply equally to saved templates and fallbacks.
- Email URLs use explicit request-scoped origins rather than global mutable state, preventing concurrent requests from mixing account domains.
- Manual email sends require a short-lived, single-use email_send admin OTP, preventing the public mail endpoint from becoming an open relay without relying on browser-stored roles.