-- Bind each API key to a list of allowed origins. Existing keys default to NULL,
-- which validateApiKey() treats as "no origin restriction" (back-compat with
-- approved keys created before this change). New keys SHOULD set this list.
--
-- Format: an array of normalized origins, e.g. ['https://example.com', 'https://app.example.com']
-- A leaked key can no longer be replayed from an attacker-controlled origin
-- once the owner sets allowed_origins.

ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS allowed_origins text[] DEFAULT NULL;

COMMENT ON COLUMN public.api_keys.allowed_origins IS
  'Allowed Origin header values for this key. NULL = unrestricted (legacy). Set to a non-empty array to restrict.';
