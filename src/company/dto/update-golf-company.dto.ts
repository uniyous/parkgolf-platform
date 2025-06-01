import { PartialType } from '@nestjs/mapped-types';
import { CreateGolfCompanyDto } from './create-golf-company.dto';

export class UpdateGolfCompanyDto extends PartialType(CreateGolfCompanyDto) {}
