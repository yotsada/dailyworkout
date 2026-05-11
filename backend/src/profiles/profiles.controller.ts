import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';

@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private profilesService: ProfilesService) {}

  @Post()
  create(@Body() dto: CreateProfileDto, @Request() req: { user: { id: string } }) {
    return this.profilesService.create(dto, req.user.id);
  }

  @Get()
  findAll(@Request() req: { user: { id: string } }) {
    return this.profilesService.findAll(req.user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreateProfileDto, @Request() req: { user: { id: string } }) {
    return this.profilesService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.profilesService.remove(id, req.user.id);
  }
}
