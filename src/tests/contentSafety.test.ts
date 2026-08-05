import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const USER_FACING_COPY_FILES = [
  'src/types/index.ts',
  'src/utils/v1Framework.ts',
  'src/utils/brandCopy.ts',
  'src/utils/frameworkRecommendations.ts',
  'src/services/localNotifications.ts',
  'src/pages/onboarding/OnboardingFlow.tsx',
  'src/pages/DetailScreen.tsx',
  'src/pages/HomeScreen.tsx',
  'src/pages/ImproveScreen.tsx',
  'src/components/modals/ProgressiveDomainSetupModal.tsx',
] as const;

describe('content safety', () => {
  it('keeps framework, questions, nudges, and setup copy free from explicit or sexual wording', () => {
    const copy = USER_FACING_COPY_FILES.map((file) => readFileSync(file, 'utf8')).join('\n');

    expect(copy).not.toMatch(
      /\b(sex|sexual|sexy|erotic|flirt|flirting|intimacy|intimate|porn|nude|naked|orgasm|masturbat(?:e|ion|ing)?|fetish|bedroom|hook\s?up)\b/i,
    );
    expect(copy).not.toMatch(/\b(consent-led|closeness|affection|not in the mood)\b/i);
  });
});
