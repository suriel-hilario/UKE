# Terraform state lives in a DigitalOcean Spaces bucket (S3-compatible), not
# locally and not in git. The bucket itself (uke-terraform-state, region ams3)
# must be created manually, once, before `terraform init` can succeed here —
# see docs/infra/TERRAFORM.md. DO Spaces mimics the S3 API but isn't real AWS
# S3, hence the skip_* flags below (design.md § D3).
terraform {
  backend "s3" {
    bucket                      = "uke-terraform-state"
    key                         = "uke-prod/terraform.tfstate"
    region                      = "ams3"
    endpoint                    = "https://ams3.digitaloceanspaces.com"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    force_path_style            = true
  }
}
