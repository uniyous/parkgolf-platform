import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { GolfCompanyService } from '../service/golf-company.service';
import { CreateGolfCompanyDto } from '../dto/create-golf-company.dto';
import { UpdateGolfCompanyDto } from '../dto/update-golf-company.dto';

@Controller('golf-companies')
export class GolfCompanyController {
  constructor(private readonly golfCompanyService: GolfCompanyService) {}

  @Post()
  create(@Body() createGolfCompanyDto: CreateGolfCompanyDto) {
    return this.golfCompanyService.create(createGolfCompanyDto);
  }

  @Get()
  findAll() {
    return this.golfCompanyService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.golfCompanyService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateGolfCompanyDto: UpdateGolfCompanyDto) {
    return this.golfCompanyService.update(id, updateGolfCompanyDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const result = await this.golfCompanyService.remove(id);
    return {
      message: `GolfCompany with ID ${id} successfully deleted.`,
      result,
    };
  }
}
