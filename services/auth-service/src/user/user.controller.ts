import {
    Controller,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBody,
    ApiParam,
} from '@nestjs/swagger';
import { UserEntity } from './entities/user.entity'; // For response type

@ApiTags('Users')
@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post('signup')
    @ApiOperation({ summary: 'Register (Sign Up) a new user' })
    @ApiBody({ type: CreateUserDto })
    @ApiResponse({
        status: 201,
        description: 'User successfully registered.',
        type: UserEntity,
    })
    @ApiResponse({ status: 400, description: 'Bad Request (e.g., validation error).' })
    @ApiResponse({ status: 409, description: 'Conflict (e.g., email already exists).' })
    async signUp(@Body() createUserDto: CreateUserDto) {
        const user = await this.userService.signUp(createUserDto);
        return new UserEntity(user);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update user details' })
    @ApiParam({ name: 'id', description: 'User ID', type: Number })
    @ApiBody({ type: UpdateUserDto })
    @ApiResponse({
        status: 200,
        description: 'User successfully updated.',
        type: UserEntity,
    })
    @ApiResponse({ status: 400, description: 'Bad Request.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    @ApiResponse({ status: 409, description: 'Conflict (e.g., email already in use).' })
    async updateUser(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateUserDto: UpdateUserDto,
    ) {
        const user = await this.userService.updateUser(id, updateUserDto);
        return new UserEntity(user);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK) // Or HttpStatus.NO_CONTENT if you prefer not to send a body
    @ApiOperation({ summary: 'Delete a user account' })
    @ApiParam({ name: 'id', description: 'User ID', type: Number })
    @ApiResponse({ status: 200, description: 'User successfully deleted.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    async deleteUser(@Param('id', ParseIntPipe) id: number) {
        return this.userService.deleteUser(id);
    }
}