export enum FeedbackStatus {
  NEW = "New",
  IN_REVIEW = "In Review",
  IN_PROGRESS = "In Progress",
  DONE = "Done",
  REJECTED = "Rejected",
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
