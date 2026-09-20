import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { UsersService } from '../users/users.service';
import { User } from '../database/schema';

const AVATAR_DIR = join(process.cwd(), 'uploads', 'avatars');

function ensureAvatarDir(): void {
  if (!existsSync(AVATAR_DIR)) {
    mkdirSync(AVATAR_DIR, { recursive: true });
  }
}

@Controller('uploads')
export class UploadsController {
  constructor(private readonly usersService: UsersService) {}

  @Post('avatar')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureAvatarDir();
          cb(null, AVATAR_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase() || '.jpg';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
          cb(new BadRequestException('Only JPEG, PNG, WebP, or GIF images are allowed') as never, false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request & { user: User },
  ): Promise<{ avatarUrl: string; user: ReturnType<UsersService['toUserType']> }> {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }

    const avatarUrl = `/uploads/avatars/${file.filename}`;
    const user = await this.usersService.setAvatarUrl(req.user.id, avatarUrl);
    return {
      avatarUrl,
      user: this.usersService.toUserType(user),
    };
  }
}
