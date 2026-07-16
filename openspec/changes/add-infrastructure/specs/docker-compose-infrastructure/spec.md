## Purpose

Provide a reproducible local development environment where developers can start the full stack (web app, API, database) with a single command. Docker Compose orchestrates three services to mirror production topology while enabling fast iteration with live reload and hot module replacement.

## Requirements

### Requirement: Docker Compose file defines local development stack

The project root SHALL contain a `docker-compose.yml` file that defines three services: `web`, `api`, and `postgres`. The file SHALL allow a developer to run `docker-compose up` and have a fully functional local environment without additional setup.

#### Scenario: Docker Compose file exists at project root

- **WHEN** a developer clones the repository
- **THEN** a file `docker-compose.yml` exists at the project root

#### Scenario: Three services are defined

- **WHEN** `docker-compose.yml` is parsed
- **THEN** it defines services named `web`, `api`, and `postgres`

---

### Requirement: Web service runs React dev server on port 3000

The `web` service in docker-compose.yml SHALL build from the project source, expose port 3000, and run the React development server (Vite dev server).

#### Scenario: Web service is accessible on port 3000

- **WHEN** `docker-compose up` is executed and all services are healthy
- **THEN** the React dev server is accessible at `http://localhost:3000`

#### Scenario: Web service mounts source code for live reload

- **WHEN** a source file in `apps/web/src` is edited
- **THEN** the change is reflected in the running dev server (Vite hot module replacement works)

#### Scenario: Web service respects Vite dev server configuration

- **WHEN** the web service starts
- **THEN** it runs `pnpm dev` (or equivalent) from the `apps/web` directory and the Vite dev server is available

---

### Requirement: API service runs NestJS dev server on port 3001

The `api` service in docker-compose.yml SHALL build from the project source, expose port 3001, and run the NestJS development server.

#### Scenario: API service is accessible on port 3001

- **WHEN** `docker-compose up` is executed and all services are healthy
- **THEN** the NestJS dev server is accessible at `http://localhost:3001`

#### Scenario: API service has /health endpoint

- **WHEN** a GET request is made to `http://localhost:3001/health`
- **THEN** the server responds with HTTP 200 and a health status (no-op response, implementation deferred)

#### Scenario: API service respects NestJS dev server configuration

- **WHEN** the api service starts
- **THEN** it runs `pnpm dev` (or equivalent) from the `apps/api` directory and the NestJS dev server is available

---

### Requirement: Postgres service provides database on port 5432

The `postgres` service in docker-compose.yml SHALL use the official postgres:16 image, expose port 5432, initialize with a test database and user, and include a healthcheck.

#### Scenario: Postgres is accessible on port 5432

- **WHEN** `docker-compose up` is executed
- **THEN** PostgreSQL is accessible at `localhost:5432` with default credentials (configured in docker-compose.yml)

#### Scenario: Postgres has healthcheck

- **WHEN** `docker-compose ps` is run after services have started
- **THEN** the postgres service shows status "Up" with healthcheck passing (e.g., `(healthy)`)

#### Scenario: Postgres data persists in a named volume

- **WHEN** `docker-compose up` is run
- **THEN** postgres data is stored in a named volume (not an ephemeral directory) so data persists across container restarts

---

### Requirement: Service dependencies are correctly ordered

The api service SHALL depend on postgres being healthy before starting. The web and api services MAY be accessed once both are healthy.

#### Scenario: API waits for Postgres healthcheck

- **WHEN** `docker-compose up` is executed
- **THEN** the api service does not start until the postgres service reports healthy status

#### Scenario: All services are ready simultaneously

- **WHEN** `docker-compose up` completes without errors
- **THEN** all three services (web, api, postgres) are running and the web app can make requests to the api

---

### Requirement: Environment variables are configured for development

The docker-compose.yml SHALL define environment variables for postgres (user, password, database) and any needed by the api and web services to connect to postgres and each other.

#### Scenario: Postgres environment variables are set

- **WHEN** the postgres service starts
- **THEN** it initializes with POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_DB as defined in docker-compose.yml

#### Scenario: API can connect to Postgres

- **WHEN** the api service is running
- **THEN** it can connect to postgres at `postgres:5432` (hostname resolved via Docker's internal DNS)

#### Scenario: Web can connect to API

- **WHEN** the web service is running
- **THEN** it can make HTTP requests to the api at `http://api:3001` (internal Docker network)
