export interface JwtPayload {
  sub: string
  email?: string
  [claim: string]: unknown
}
