import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus,
  HttpException,
  Req,
} from '@nestjs/common';
import { CourseService } from '../courses/courses.service';
import { Request } from 'express';

// Club DTOs
export interface ClubFiltersDto {
  companyId?: number;
  location?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateClubDto {
  companyId: number;
  name: string;
  location: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  operatingHours: {
    open: string;
    close: string;
  };
  facilities?: string[];
  status: 'ACTIVE' | 'MAINTENANCE' | 'SEASONAL_CLOSED' | 'INACTIVE';
}

export interface UpdateClubDto {
  name?: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  operatingHours?: {
    open: string;
    close: string;
  };
  facilities?: string[];
  status?: 'ACTIVE' | 'MAINTENANCE' | 'SEASONAL_CLOSED' | 'INACTIVE';
  seasonInfo?: {
    type: 'peak' | 'regular' | 'off';
    startDate: string;
    endDate: string;
  };
}

@Controller('api/admin/club')
export class ClubController {
  constructor(private readonly courseService: CourseService) {}

  @Get('clubs')
  async getClubs(@Query() filters: ClubFiltersDto, @Req() req: Request) {
    try {
      const adminToken = req.headers.authorization?.replace('Bearer ', '') || '';
      const result = await this.courseService.getClubs(filters, adminToken);
      return result;
    } catch (error) {
      console.error('Failed to fetch clubs:', error);
      throw new HttpException(
        'Failed to fetch clubs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('clubs/:id')
  async getClubById(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    try {
      const adminToken = req.headers.authorization?.replace('Bearer ', '') || '';
      const result = await this.courseService.getClubById(id, adminToken);
      return result;
    } catch (error) {
      console.error('Failed to fetch club:', error);
      throw new HttpException(
        'Failed to fetch club',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('clubs')
  async createClub(@Body() createClubDto: CreateClubDto, @Req() req: Request) {
    try {
      const adminToken = req.headers.authorization?.replace('Bearer ', '') || '';
      const result = await this.courseService.createClub(createClubDto, adminToken);
      return result;
    } catch (error) {
      console.error('Failed to create club:', error);
      throw new HttpException(
        'Failed to create club',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('clubs/:id')
  async updateClub(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClubDto: UpdateClubDto,
    @Req() req: Request,
  ) {
    try {
      const adminToken = req.headers.authorization?.replace('Bearer ', '') || '';
      const result = await this.courseService.updateClub(id, updateClubDto, adminToken);
      return result;
    } catch (error) {
      console.error('Failed to update club:', error);
      throw new HttpException(
        'Failed to update club',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('clubs/:id')
  async deleteClub(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    try {
      const adminToken = req.headers.authorization?.replace('Bearer ', '') || '';
      const result = await this.courseService.deleteClub(id, adminToken);
      return result;
    } catch (error) {
      console.error('Failed to delete club:', error);
      throw new HttpException(
        'Failed to delete club',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('company/:companyId/clubs')
  async getClubsByCompany(@Param('companyId', ParseIntPipe) companyId: number, @Req() req: Request) {
    try {
      const adminToken = req.headers.authorization?.replace('Bearer ', '') || '';
      const result = await this.courseService.getClubsByCompany(companyId, adminToken);
      return result;
    } catch (error) {
      console.error('Failed to fetch clubs by company:', error);
      throw new HttpException(
        'Failed to fetch clubs by company',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('search')
  async searchClubs(@Query('q') query: string, @Req() req: Request) {
    try {
      const adminToken = req.headers.authorization?.replace('Bearer ', '') || '';
      const result = await this.courseService.searchClubs(query, adminToken);
      return { data: result };
    } catch (error) {
      console.error('Failed to search clubs:', error);
      throw new HttpException(
        'Failed to search clubs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}