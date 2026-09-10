variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "Public SSH key to install on the Droplet"
  type        = string
}

variable "ssh_private_key_path" {
  description = "Path to the private SSH key matching ssh_public_key (used for local provisioning tooling, not by Terraform itself)"
  type        = string
  default     = "~/.ssh/id_ed25519"
}

variable "droplet_name" {
  description = "Name of the production Droplet"
  type        = string
  default     = "uke-prod"
}

variable "region" {
  description = "DigitalOcean region slug"
  type        = string
  default     = "ams3"
}

variable "droplet_size" {
  description = "DigitalOcean Droplet size slug"
  type        = string
  default     = "s-2vcpu-2gb-amd"
}
