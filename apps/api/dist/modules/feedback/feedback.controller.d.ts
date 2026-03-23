import { FeedbackService } from './feedback.service';
export declare class FeedbackController {
    private feedbackService;
    constructor(feedbackService: FeedbackService);
    create(req: any, body: any): Promise<any>;
    findAll(req: any): Promise<Feedback[]>;
    findOne(req: any, id: string): Promise<any>;
}
