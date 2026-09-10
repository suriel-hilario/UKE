terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.41"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_ssh_key" "this" {
  name       = "${var.droplet_name}-key"
  public_key = var.ssh_public_key
}

resource "digitalocean_droplet" "this" {
  name      = var.droplet_name
  image     = "ubuntu-24-04-x64"
  size      = var.droplet_size
  region    = var.region
  ssh_keys  = [digitalocean_ssh_key.this.id]
  user_data = file("${path.module}/cloud-init.yaml")

  # cloud-init only installs OS-level dependencies (Docker, git, swap, UFW) —
  # it never clones the repo or starts the app. Deploys happen separately,
  # over SSH, via .github/workflows/deploy.yml running deploy.sh.
}

resource "digitalocean_firewall" "this" {
  name = "${var.droplet_name}-firewall"

  droplet_ids = [digitalocean_droplet.this.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}
