<!-- TEMPLATE PROVISÓRIO — substitua pelo template oficial da equipe (ver docs/open-decisions.md) -->
**Como** {{persona}}
**Quero** {{want}}
**Para** {{so_that}}

**Critérios de aceite**
{{#acceptance}}- **Dado** {{given}}
  **Quando** {{when}}
  **Então** {{then}}
  _Fonte: {{evidence}}_
{{/acceptance}}
{{#business_rules}}
**Regras de negócio**
- {{text}} _(Fonte: {{evidence}})_
{{/business_rules}}
{{#compliance_flags.length}}**Compliance:** {{compliance_flags}}{{/compliance_flags.length}}
{{#dependencies.length}}**Depende de:** {{dependencies}}{{/dependencies.length}}
**Classificação sugerida (decisão final é do Designer):** {{classification_hint}}

**Evidências do discovery:** {{evidence}}
{{#open_questions}}- ❓ [{{kind}}] {{text}}
{{/open_questions}}
_discovery-id: {{id}}_
