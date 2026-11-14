# Domain Fit Standard (Service Cloud + financial products)

- **Standard-first:** the need is written as a business behavior so the Designer can test standard/declarative options before custom ones. `classification_hint` is a hint, never a decision.
- **Domain mapping:** each story maps to one Journey Designer domain (`docs/sdd/DOMAINS.md` of the Designer project) or to `_fundacao`; stories that span domains are split.
- **LGPD, regulatory and security:** sensitive customer/financial data, consent, masking, retention, auditability and recording require a stated rule or an open question — never silence.
- **Integrations:** dependencies on financial-product systems (balances, contracts, limits, payments) are declared with their source of truth and availability assumptions as open questions when unknown.
- **Channels and operation:** receptive channels, routing, SLA and console implications are stated or asked.
