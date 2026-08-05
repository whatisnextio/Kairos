# Supabase Auth Email Templates

These files are the source-controlled templates for Supabase Auth.

## Magic Link

- Subject: `Welcome to Kairos`
- Local config: `supabase/config.toml` uses `auth.email.template.magic_link`
- HTML source: `supabase/templates/magic-link.html`
- Plain-text fallback copy: `supabase/templates/magic-link.txt`

Supabase hosted projects manage email templates from the Dashboard or Management API. The HTML template must be copied to the hosted `Magic Link` template as `mailer_templates_magic_link_content`, with the subject set as `mailer_subjects_magic_link`.

To apply the source-controlled template to the linked hosted project:

```sh
SUPABASE_ACCESS_TOKEN=... node scripts/apply-supabase-email-template.mjs
```

The access token must belong to an account with permission to update the project's Auth configuration.

The template intentionally keeps the core login URL as `{{ .ConfirmationURL }}` so mobile magic links keep Supabase's configured redirect behaviour.
