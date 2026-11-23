-- Applied to the dedicated WillowLab Fileport Neon project's main branch.
-- Additive, project-local metadata only. Object bytes live in PRIVATE Neon storage.
CREATE TABLE IF NOT EXISTS public.fileport_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_key text NOT NULL UNIQUE,
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 255),
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
  sha256 text,
  state text NOT NULL DEFAULT 'staged'
    CHECK (state IN ('staged', 'approved', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.fileport_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  label text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.fileport_share_files (
  share_id uuid NOT NULL REFERENCES public.fileport_shares(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.fileport_files(id) ON DELETE CASCADE,
  PRIMARY KEY (share_id, file_id)
);
CREATE TABLE IF NOT EXISTS public.fileport_receipts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  share_id uuid REFERENCES public.fileport_shares(id) ON DELETE SET NULL,
  file_id uuid REFERENCES public.fileport_files(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('share_viewed', 'download_issued')),
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fileport_share_files_by_file ON public.fileport_share_files(file_id);
CREATE INDEX IF NOT EXISTS fileport_receipts_at ON public.fileport_receipts(at DESC);
