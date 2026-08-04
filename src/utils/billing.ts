export function buildStripeCheckoutUrl({
  checkoutUrl,
  profileId,
}: {
  checkoutUrl?: string;
  profileId?: string | null;
}): string | null {
  const trimmed = checkoutUrl?.trim();
  if (!trimmed || !profileId) return null;

  try {
    const url = new URL(trimmed);
    url.searchParams.set('client_reference_id', profileId);
    return url.toString();
  } catch {
    return null;
  }
}
