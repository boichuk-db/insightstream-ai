import { IsIn } from 'class-validator';

export const FEEDBACK_STATUSES = [
  'New',
  'In Review',
  'In Progress',
  'Done',
  'Rejected',
  'Archived',
] as const;

export class UpdateStatusDto {
  @IsIn(FEEDBACK_STATUSES)
  status: string;
}
