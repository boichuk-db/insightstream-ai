import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMember } from '@insightstream/database';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private jwtService: JwtService,
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string;
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.join(`user-${payload.sub}`);
      // Team rooms: one emit to team-{id} reaches every member's dashboard.
      // Known limit: membership changes don't rebuild rooms until reconnect.
      const memberships = await this.memberRepo.find({
        where: { userId: payload.sub },
      });
      for (const m of memberships) {
        client.join(`team-${m.teamId}`);
      }
      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitFeedbackUpdatedToTeam(teamId: string) {
    this.server
      .to(`team-${teamId}`)
      .emit('feedbackUpdated', { timestamp: new Date() });
  }
}
