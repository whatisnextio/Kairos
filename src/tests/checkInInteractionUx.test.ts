import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const checkInModal = readFileSync('src/components/modals/CheckInStatusModal.tsx', 'utf8');
const homeScreen = readFileSync('src/pages/HomeScreen.tsx', 'utf8');
const css = readFileSync('src/index.css', 'utf8');

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

  it('uses plain tick language when clearing a check-in', () => {
    expect(checkInModal).toContain("title: 'Clear tick'");
    expect(checkInModal).toContain('body: "Remove today\'s tick."');
    expect(checkInModal).not.toContain("Remove today's mark.");
  });

  it('uses the status modal for custom routes instead of silent tap cycling', () => {
    expect(homeScreen).toContain('onClick={() => setSelectedCustomRouteId(route.id)}');
    expect(homeScreen).toContain('const currentStatus: CheckInStatus =');
    expect(homeScreen).toContain('void setCustomRouteCheckIn(selectedCustomRouteId, status);');
    expect(homeScreen).not.toContain('nextStatus');
  });

  it('keeps day protocol actions at the 44px minimum', () => {
    expect(homeScreen).toContain('data-testid="day-state-protocol"');
    expect(homeScreen).toContain('className="w-full sm:w-auto"');
    expect(css).toContain('inline-flex min-h-11');
    expect(homeScreen).not.toContain('px-1');
  });
});
