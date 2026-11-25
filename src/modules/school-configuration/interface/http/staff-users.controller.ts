import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { hashScryptSecret } from '../../../../shared/scrypt-hash';
import { STAFF_USERS, StaffUsers, StaffUserSummary } from '../../auth.tokens';
import { AdminRoleGuard, AuthenticatedAdminRequest } from './admin-role.guard';

class CreateStaffUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsIn(['staff', 'admin'])
  role?: 'staff' | 'admin';
}

class UpdateStaffUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsIn(['staff', 'admin'])
  role?: 'staff' | 'admin';

  @IsOptional()
  @IsIn(['active', 'suspended'])
  status?: 'active' | 'suspended';

  @IsOptional()
  @IsString()
  password?: string;
}

@Controller('admin/staff-users')
@UseGuards(AdminRoleGuard)
export class StaffUsersController {
  constructor(
    @Inject(STAFF_USERS)
    private readonly staffUsers: StaffUsers,
  ) {}

  @Get()
  async list(): Promise<{ items: StaffUserSummary[] }> {
    const items = await this.staffUsers.findAll();
    return { items };
  }

  @Post()
  async create(@Body() dto: CreateStaffUserDto): Promise<StaffUserSummary> {
    const username = dto?.username?.trim() ?? '';
    const fullName = dto?.fullName?.trim() ?? '';
    const password = dto?.password ?? '';
    const role = dto?.role;

    if (
      !username ||
      username.length > 100 ||
      !fullName ||
      fullName.length > 150 ||
      password.length < 8 ||
      (role !== 'staff' && role !== 'admin')
    ) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน และรหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
      });
    }

    const existing = await this.staffUsers.findByUsername(username);
    if (existing) {
      throw new ConflictException({
        code: 'STAFF_USERNAME_EXISTS',
        message: 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว',
      });
    }

    return this.staffUsers.create({
      username,
      passwordHash: hashScryptSecret(password),
      fullName,
      role,
    });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffUserDto,
    @Req() request: AuthenticatedAdminRequest,
  ): Promise<StaffUserSummary> {
    const existing = await this.staffUsers.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'STAFF_USER_NOT_FOUND',
        message: 'ไม่พบบัญชีผู้ใช้งานที่ต้องการแก้ไข',
      });
    }

    const currentUsername = request.adminUser?.username;
    if (
      currentUsername === existing.username &&
      (dto.status === 'suspended' || dto.role === 'staff')
    ) {
      throw new ConflictException({
        code: 'CANNOT_MODIFY_OWN_ADMIN_ACCESS',
        message: 'ไม่สามารถระงับการใช้งานหรือลดสิทธิ์บัญชี Admin ของตัวเองได้',
      });
    }

    let fullName: string | undefined;
    if (dto.fullName !== undefined) {
      fullName = dto.fullName.trim();
      if (!fullName || fullName.length > 150) {
        throw new BadRequestException({
          code: 'INVALID_REQUEST',
          message: 'กรุณากรอกชื่อ-นามสกุลให้ถูกต้อง',
        });
      }
    }

    let passwordHash: string | undefined;
    if (dto.password !== undefined) {
      if (dto.password.length < 8) {
        throw new BadRequestException({
          code: 'INVALID_REQUEST',
          message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
        });
      }
      passwordHash = hashScryptSecret(dto.password);
    }

    const updated = await this.staffUsers.update(id, {
      fullName,
      role: dto.role,
      status: dto.status,
      passwordHash,
    });
    if (!updated) {
      throw new NotFoundException({
        code: 'STAFF_USER_NOT_FOUND',
        message: 'ไม่พบบัญชีผู้ใช้งานที่ต้องการแก้ไข',
      });
    }

    return updated;
  }
}
