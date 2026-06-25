/**
 * Task 15 — SQS Feedback Processor Lambda
 * Triggered by SQS queue when new feedback is submitted via widget.
 * Currently logs events for analytics/monitoring purposes.
 * Can be extended to trigger webhooks, Slack notifications, etc.
 */
export const handler = async (event) => {
  const results = [];

  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      console.log('Feedback received:', JSON.stringify({
        feedbackId: body.feedbackId,
        projectId: body.projectId,
        source: body.source,
        createdAt: body.createdAt,
      }));

      // Future: send Slack notification, webhook, analytics event, etc.

      results.push({ messageId: record.messageId, status: 'ok' });
    } catch (err) {
      console.error('Failed to process record:', record.messageId, err);
      results.push({ messageId: record.messageId, status: 'error', error: err.message });
    }
  }

  return { batchItemFailures: [] };
};
