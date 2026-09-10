import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt'
import { passportJwtSecret } from 'jwks-rsa'
import { loadAuthConfig } from '../config/auth.config'
import { JwtPayload } from './jwt-payload'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const { domain, audience } = loadAuthConfig()

    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${domain}/.well-known/jwks.json`,
      }),
      audience,
      issuer: `https://${domain}/`,
      algorithms: ['RS256'],
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    } as StrategyOptionsWithRequest)
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload
  }
}
