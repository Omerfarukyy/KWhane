-- ─────────────────────────────────────────────────────────────────────────────
-- 002_tickets.sql
-- User support tickets — persisted per user, not per home
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tickets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject     TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'Şikayet',
    message     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'Açık',
    created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tickets_user_policy ON public.tickets;
CREATE POLICY tickets_user_policy ON public.tickets
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at DESC);
