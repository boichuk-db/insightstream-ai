export enum FeedbackStatus {
  NEW = "New",
  IN_REVIEW = "In Review",
  IN_PROGRESS = "In Progress",
  DONE = "Done",
  REJECTED = "Rejected",
  ARCHIVED = "Archived",
}

export interface IFeedback {
  id: string;
  content: string;
  source?: string;
  sentimentScore?: number;
  category?: string;
  aiSummary?: string;
  status: FeedbackStatus;
  tags?: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}
