## ADDED Requirements

### Requirement: Droplet, firewall, and SSH key managed by Terraform
The repository SHALL include `infra/terraform/main.tf` defining, via the `digitalocean/digitalocean` provider: a `digitalocean_droplet` resource (image `ubuntu-24-04-x64`, size `s-2vcpu-2gb-amd`, region `ams3`, `user_data` set to `cloud-init.yaml`), a `digitalocean_firewall` resource allowing inbound 22/80/443 from anywhere and all outbound, and a `digitalocean_ssh_key` resource referenced by the Droplet resource (proposal § Terraform; `design.md` § D1).

#### Scenario: Droplet matches the spec from add-infra-digitalocean
- **WHEN** `terraform apply` creates the Droplet
- **THEN** it is Ubuntu 24.04 LTS, the `s-2vcpu-2gb-amd` size, in the `ams3` region — the same specification `add-infra-digitalocean` used for manual creation

#### Scenario: Firewall restricts inbound traffic
- **WHEN** the `digitalocean_firewall` resource is applied
- **THEN** only ports 22, 80, and 443 are open to inbound traffic from any source; all other inbound traffic is denied

### Requirement: Terraform variables and outputs
The repository SHALL include `infra/terraform/variables.tf` defining `do_token`, `ssh_public_key`, `ssh_private_key_path`, `droplet_name` (default `uke-prod`), `region` (default `ams3`), and `droplet_size` (default `s-2vcpu-2gb-amd`), and `infra/terraform/outputs.tf` exposing `droplet_ip` and `droplet_id` (proposal § Terraform).

#### Scenario: Droplet IP is available after apply
- **WHEN** `terraform apply` completes successfully
- **THEN** `terraform output droplet_ip` returns the Droplet's public IP address

### Requirement: cloud-init provisions the OS but never starts the app
`infra/terraform/cloud-init.yaml`, passed as the Droplet's `user_data`, SHALL install `docker-ce`, the Docker Compose plugin, and `git`; create `/opt/uke` with correct permissions; add a 2GB swap file; and configure UFW to allow OpenSSH/80/443 and deny all other inbound traffic by default. It SHALL NOT clone the application repository or start any application containers — that remains the deploy pipeline's responsibility (proposal § Droplet provisioning via cloud-init; `design.md` § D2).

#### Scenario: Fresh Droplet has Docker and UFW configured, but no running app
- **WHEN** a Droplet boots for the first time with this `cloud-init.yaml`
- **THEN** Docker, the Compose plugin, and git are installed, `/opt/uke` exists, a 2GB swap file is active, and UFW allows only 22/80/443 — but no application code has been cloned and no containers are running

### Requirement: Terraform state stored in a DigitalOcean Spaces bucket
The repository SHALL include `infra/terraform/backend.tf` configuring Terraform's `s3` backend type against a DigitalOcean Spaces bucket (`uke-terraform-state`, region `ams3`), with `skip_credentials_validation`, `skip_metadata_api_check`, and `skip_region_validation` all set to `true` and path-style addressing enabled, since DO Spaces is S3-API-compatible but not real AWS S3 (`design.md` § D3). The bucket itself SHALL be created manually, once, before `terraform init` can run — documented in `docs/infra/TERRAFORM.md` (proposal § Terraform state).

#### Scenario: Terraform state is not stored locally or in git
- **WHEN** `terraform apply` runs
- **THEN** the resulting state file is stored in the `uke-terraform-state` DO Spaces bucket, not committed to the repository and not left only on the machine that ran `apply`

### Requirement: terraform.tfvars.example and .gitignore entries
The repository SHALL include `infra/terraform/terraform.tfvars.example` with placeholder values (no real secrets), and `.gitignore` SHALL exclude `terraform.tfvars`, `.terraform/`, `*.tfstate`, and `*.tfstate.backup` — but SHALL NOT exclude `.terraform.lock.hcl`, which is committed to pin provider versions (proposal § Terraform, `.gitignore` additions).

#### Scenario: Real Terraform variables are never committed
- **WHEN** a contributor runs `terraform init`/`plan`/`apply` locally
- **THEN** their real `terraform.tfvars` file is ignored by git; only `terraform.tfvars.example` (placeholders) is tracked

#### Scenario: Provider lock file is committed
- **WHEN** the repository is inspected
- **THEN** `infra/terraform/.terraform.lock.hcl` is present and tracked in git, ensuring reproducible provider versions across machines

### Requirement: Infrastructure workflow is manual and approval-gated
`.github/workflows/infra.yml` SHALL trigger only on `workflow_dispatch` (never on push or pull request) and SHALL run inside a GitHub "production" Environment configured to require manual approval before the job proceeds. Its steps SHALL be, in order: `terraform init` (using the DO Spaces backend), `terraform plan`, and `terraform apply -auto-approve` (proposal § Infrastructure workflow; `design.md` § D4).

#### Scenario: Infra workflow never runs automatically
- **WHEN** a commit is pushed to any branch, or a pull request is opened
- **THEN** `infra.yml` does not trigger

#### Scenario: Infra workflow requires manual approval
- **WHEN** `infra.yml` is manually triggered via `workflow_dispatch`
- **THEN** the job pauses for a required reviewer's approval (via the "production" Environment) before `terraform apply` runs

### Requirement: DO_DROPLET_IP secret is updated automatically after apply
After a successful `terraform apply`, `infra.yml` SHALL update the `DO_DROPLET_IP` GitHub Actions secret via the GitHub API, using the `droplet_ip` Terraform output as the new value, so that `deploy.yml` always targets the current Droplet without a manual step (proposal § Infrastructure workflow). This SHALL use a dedicated personal access token with repository-secrets write permission (stored as its own secret), since the default `GITHUB_TOKEN` does not have permission to write repository secrets (`design.md` § D9).

#### Scenario: DO_DROPLET_IP reflects the latest apply
- **WHEN** `terraform apply` creates or replaces the Droplet, producing a new IP
- **THEN** the `DO_DROPLET_IP` GitHub secret is updated to that new IP by the end of the `infra.yml` run, without a human manually editing it
