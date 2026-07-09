export const FEEDBACK_EVENTS_PUBLISHER = Symbol('FEEDBACK_EVENTS_PUBLISHER');

export interface FeedbackEventsPublisher {
  emitFeedbackUpdatedForProject(projectId: string): Promise<void>;
}
