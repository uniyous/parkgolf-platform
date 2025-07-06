import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        return super.canActivate(context);
    }

    handleRequest(err, user, info) {
        if (err || !user) {
            // Log more info for debugging if needed
            // console.error('JWT Auth Error:', err, 'Info:', info && info.message, 'User:', user);
            throw err || new UnauthorizedException(info?.message || 'User is not authenticated');
        }
        return user;
    }
}