import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectsService } from './projects.service';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async create(@Request() req: any, @Body() body: { name: string; domain?: string }) {
    return this.projectsService.create(req.user.id, body);
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.projectsService.findAllByUser(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.projectsService.findOne(id, req.user.id);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.projectsService.remove(id, req.user.id);
  }
}
