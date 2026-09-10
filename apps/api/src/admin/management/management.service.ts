import { Injectable } from '@nestjs/common'
import { AuthenticationClient, ManagementClient } from 'auth0'
import { loadManagementConfig } from '../../config/management.config'

const DB_CONNECTION = 'Username-Password-Authentication'

@Injectable()
export class ManagementService {
  private readonly config = loadManagementConfig()

  private readonly managementClient = new ManagementClient({
    domain: this.config.domain,
    clientId: this.config.clientId,
    clientSecret: this.config.clientSecret,
    audience: this.config.audience,
  })

  // /dbconnections/change_password vive en la Authentication API, no en la Management API.
  private readonly authClient = new AuthenticationClient({
    domain: this.config.domain,
    clientId: this.config.clientId,
  })

  async createUser(email: string, name: string): Promise<string> {
    const created = await this.managementClient.users.create({
      connection: DB_CONNECTION,
      email,
      name,
      password: randomPassword(),
      email_verified: false,
    })

    if (!created.user_id) {
      throw new Error('Auth0 did not return a user_id for the created user')
    }

    return created.user_id
  }

  async updateUser(auth0Id: string, changes: { email?: string; name?: string }): Promise<void> {
    await this.managementClient.users.update(auth0Id, changes)
  }

  async blockUser(auth0Id: string): Promise<void> {
    await this.managementClient.users.update(auth0Id, { blocked: true })
  }

  async deleteUser(auth0Id: string): Promise<void> {
    await this.managementClient.users.delete(auth0Id)
  }

  async triggerPasswordReset(email: string): Promise<void> {
    await this.authClient.database.changePassword({ email, connection: DB_CONNECTION })
  }
}

function randomPassword(): string {
  // Contraseña inicial descartable: el usuario siempre entra vía reset de contraseña
  // (project.md § Autenticación: "Reset de contraseña = flujo estándar Auth0").
  return `${crypto.randomUUID()}Aa1!`
}
