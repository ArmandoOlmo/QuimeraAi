import { supabase } from '../supabase';

const PLATFORM_ASSETS_BUCKET = 'platform-assets';

export interface PlatformAssetUploadOptions {
  upsert?: boolean;
  cacheControl?: string;
  contentType?: string;
  metadata?: Record<string, unknown>;
}

export interface PlatformAssetUploadResult {
  bucket: string;
  path: string;
  publicUrl: string;
}

async function createSignedPlatformUpload(path: string, upsert: boolean): Promise<{
  path: string;
  token: string;
  publicUrl: string;
}> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token) {
    throw new Error('Supabase session is required to upload platform assets.');
  }

  const response = await fetch('/api/storage/platform-assets/signed-upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path, upsert }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Unable to create signed upload URL.');
  }

  if (!payload.token || !payload.path || !payload.publicUrl) {
    throw new Error('Signed upload response is incomplete.');
  }

  return {
    path: payload.path,
    token: payload.token,
    publicUrl: payload.publicUrl,
  };
}

export async function uploadPlatformAsset(
  path: string,
  fileBody: Blob | ArrayBuffer | Uint8Array,
  options: PlatformAssetUploadOptions = {},
): Promise<PlatformAssetUploadResult> {
  const upsert = options.upsert !== false;
  const signed = await createSignedPlatformUpload(path, upsert);

  const { error } = await supabase
    .storage
    .from(PLATFORM_ASSETS_BUCKET)
    .uploadToSignedUrl(signed.path, signed.token, fileBody, {
      cacheControl: options.cacheControl || '3600',
      contentType: options.contentType,
      metadata: options.metadata,
      upsert,
    });

  if (error) throw error;

  return {
    bucket: PLATFORM_ASSETS_BUCKET,
    path: signed.path,
    publicUrl: signed.publicUrl,
  };
}

export function getPlatformAssetPublicUrl(path: string): string {
  const { data: { publicUrl } } = supabase
    .storage
    .from(PLATFORM_ASSETS_BUCKET)
    .getPublicUrl(path);

  return publicUrl;
}
