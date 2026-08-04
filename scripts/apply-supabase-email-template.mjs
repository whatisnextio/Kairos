import { readFile } from 'node:fs/promises';
import process from 'node:process';

const projectRef = process.env.SUPABASE_PROJECT_REF ?? 'kvksenmykcnlwnaokamg';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.error('SUPABASE_ACCESS_TOKEN is required.');
  process.exit(1);
}

const html = await readFile(new URL('../supabase/templates/magic-link.html', import.meta.url), 'utf8');

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    mailer_subjects_magic_link: 'Welcome to Kairos',
    mailer_templates_magic_link_content: html,
  }),
});

if (!response.ok) {
  const body = await response.text();
  console.error(`Failed to update Supabase email template: ${response.status} ${body}`);
  process.exit(1);
}

console.log(`Updated hosted Supabase magic-link email template for ${projectRef}.`);
