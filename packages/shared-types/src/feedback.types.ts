export enum FeedbackStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface IFeedback {
  id: string;
  content: string;
  source?: string;
  sentimentScore?: number;
  category?: string;
  aiSummary?: string;
  status: FeedbackStatus;
  userId: string;
  createdAt: string;
  updatedAt: string;
}
