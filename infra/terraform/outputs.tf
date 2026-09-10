output "droplet_ip" {
  description = "Public IPv4 address of the production Droplet"
  value       = digitalocean_droplet.this.ipv4_address
}

output "droplet_id" {
  description = "DigitalOcean Droplet ID"
  value       = digitalocean_droplet.this.id
}
