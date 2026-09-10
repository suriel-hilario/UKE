import 'dotenv/config'

process.env.SMTP_HOST = process.env.SMTP_HOST ?? 'localhost'
process.env.SMTP_PORT = process.env.SMTP_PORT ?? '1025'
process.env.SMTP_FROM = process.env.SMTP_FROM ?? 'UKE App <noreply@uke.local>'
process.env.APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000'

process.env.S3_ENDPOINT = process.env.S3_ENDPOINT ?? 'http://localhost:9000'
process.env.S3_BUCKET = process.env.S3_BUCKET ?? 'uke-fotos'
process.env.S3_ACCESS_KEY = process.env.S3_ACCESS_KEY ?? 'uke_minio'
process.env.S3_SECRET_KEY = process.env.S3_SECRET_KEY ?? 'uke_minio_secret'
process.env.S3_REGION = process.env.S3_REGION ?? 'us-east-1'
