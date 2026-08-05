import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const checkInModal = readFileSync('src/components/modals/CheckInStatusModal.tsx', 'utf8');
const homeScreen = readFileSync('src/pages/HomeScreen.tsx', 'utf8');

describe('check-in interaction UX', () => {
  it('hides Clear until there is an actual mark to remove', () => {
    expect(checkInModal).toContain(
      "const hasMarkToClear = currentStatus !== undefined && currentStatus !== 'Pending';",
    );
    expect(checkInModal).toContain(
      "OPTIONS.filter((option) => option.status !== 'Pending' || hasMarkToClear)",
    );
    expect(checkInModal).not.toContain('disabled={nothingToClear}');
    expect(checkInModal).not.toContain('cursor-not-allowed');
  });

  it('uses the status modal for custom routes instead of silent tap cycling', () => {
    expect(homeScreen).toContain('onClick={() => setSelectedCustomRouteId(route.id)}');
    expect(homeScreen).toContain('const currentStatus: CheckInStatus =');
    expect(homeScreen).toContain('void setCustomRouteCheckIn(selectedCustomRouteId, status);');
    expect(homeScreen).not.toContain('nextStatus');
  });

  it('keeps the accountability prompt dismiss target at the 44px minimum', () => {
    expect(homeScreen).toContain('aria-label="Dismiss accountability prompt"');
    expect(homeScreen).toContain('w-11 h-11');
    expect(homeScreen).toContain('aria-hidden="true"');
    expect(homeScreen).not.toContain('px-1');
  });
});
