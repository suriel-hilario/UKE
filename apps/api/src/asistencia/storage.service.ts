import { Injectable } from '@nestjs/common'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3'
import { loadStorageConfig } from '../config/storage.config'

@Injectable()
export class StorageService {
  private readonly config = loadStorageConfig()

  private readonly client = new S3Client({
    endpoint: this.config.endpoint,
    region: this.config.region,
    credentials: { accessKeyId: this.config.accessKey, secretAccessKey: this.config.secretKey },
    forcePathStyle: true,
  })

  private bucketReady: Promise<void> | null = null

  private async ensureBucket(): Promise<void> {
    if (!this.bucketReady) {
      this.bucketReady = this.client
        .send(new HeadBucketCommand({ Bucket: this.config.bucket }))
        .catch(() => this.client.send(new CreateBucketCommand({ Bucket: this.config.bucket })))
        .then(() => this.ensurePublicReadPolicy())
    }
    await this.bucketReady
  }

  private async ensurePublicReadPolicy(): Promise<void> {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.config.bucket}/*`],
        },
      ],
    }
    await this.client.send(
      new PutBucketPolicyCommand({ Bucket: this.config.bucket, Policy: JSON.stringify(policy) }),
    )
  }

  async upload(buffer: Buffer, key: string, contentType: string): Promise<string> {
    await this.ensureBucket()
    await this.client.send(
      new PutObjectCommand({ Bucket: this.config.bucket, Key: key, Body: buffer, ContentType: contentType }),
    )
    return `${this.config.publicUrl}/${this.config.bucket}/${key}`
  }

  async delete(key: string): Promise<void> {
    await this.ensureBucket()
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }))
  }
}
