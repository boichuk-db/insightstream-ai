import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(body: any): Promise<User>;
    login(body: any): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            role: any;
            isPro: any;
        };
    }>;
}
