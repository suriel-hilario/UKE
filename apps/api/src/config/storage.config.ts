export interface StorageConfig {
  endpoint: string
  publicUrl: string
  bucket: string
  accessKey: string
  secretKey: string
  region: string
}

export function loadStorageConfig(env: NodeJS.ProcessEnv = process.env): StorageConfig {
  const endpoint = env.S3_ENDPOINT
  const publicUrl = env.S3_PUBLIC_URL ?? endpoint
  const bucket = env.S3_BUCKET
  const accessKey = env.S3_ACCESS_KEY
  const secretKey = env.S3_SECRET_KEY
  const region = env.S3_REGION

  const missing = [
    !endpoint && 'S3_ENDPOINT',
    !bucket && 'S3_BUCKET',
    !accessKey && 'S3_ACCESS_KEY',
    !secretKey && 'S3_SECRET_KEY',
    !region && 'S3_REGION',
  ].filter(Boolean)

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  return {
    endpoint: endpoint!,
    publicUrl: publicUrl!,
    bucket: bucket!,
    accessKey: accessKey!,
    secretKey: secretKey!,
    region: region!,
  }
}
