import { Repository } from 'typeorm';
import { Feedback } from '@insightstream/database';
export declare class FeedbackService {
    private feedbackRepository;
    constructor(feedbackRepository: Repository<Feedback>);
    create(userId: string, content: string, source?: string): Promise<any>;
    findAllByUser(userId: string): Promise<Feedback[]>;
    findOne(id: string, userId: string): Promise<any>;
}
