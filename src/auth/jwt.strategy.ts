import { Injectable } from "@nestjs/common";
import type { Request } from 'express';
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret-fallback',
        })
    }
    validate(payload: { sub: string, email: string, role: string }) {
        return { sub: payload.sub, email: payload.email, role: payload.role };
    }
}