import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async signup(username: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) throw new ConflictException('Username already taken');

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { username, password: hashed },
    });

    const token = this.jwtService.sign({ sub: user.id, username: user.username });
    return { token, user: { id: user.id, username: user.username, role: user.role } };
  }

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.password) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({ sub: user.id, username: user.username });
    return { token, user: { id: user.id, username: user.username, role: user.role } };
  }

  async googleAuth(idToken: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) throw new UnauthorizedException('Invalid Google token');

    const { sub: googleId, email, name } = payload;

    let user = await this.prisma.user.findUnique({ where: { googleId } });

    if (!user && email) {
      user = await this.prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      const baseUsername = name?.replace(/\s+/g, '_').toLowerCase() || email?.split('@')[0] || googleId;
      let username = baseUsername;
      let suffix = 1;
      while (await this.prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${suffix++}`;
      }

      user = await this.prisma.user.create({
        data: { email, googleId, username },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId },
      });
    }

    const displayName = user.username || user.email || googleId;
    const token = this.jwtService.sign({ sub: user.id, username: displayName });
    return { token, user: { id: user.id, username: displayName, role: user.role } };
  }
}
