/**
 * Task 16 — Digest Trigger Lambda
 * Triggered by EventBridge Scheduler (daily/weekly).
 * Calls the NestJS API internal endpoint to run AI digest for all projects.
 */
export const handler = async () => {
  const apiUrl = process.env.API_URL;
  const secret = process.env.INTERNAL_SECRET;

  if (!apiUrl || !secret) {
    throw new Error('API_URL and INTERNAL_SECRET env vars are required');
  }

  const response = await fetch(`${apiUrl}/digest/internal-trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': secret,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API responded ${response.status}: ${body}`);
  }

  const result = await response.json();
  console.log('Digest triggered successfully:', result);
  return result;
};
