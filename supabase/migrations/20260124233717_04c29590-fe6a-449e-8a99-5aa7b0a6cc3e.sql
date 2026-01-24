-- 1) Fix tenant resolution: allow slug prefix fallback when exact slug is missing
-- This prevents routes like /beacon/... from breaking when the real stored slug is e.g. beaconryk.
CREATE OR REPLACE FUNCTION public.get_school_public_by_slug(_slug text)
RETURNS TABLE(id uuid, slug text, name text, is_active boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_slug text;
  v_exact record;
  v_prefix_count int;
BEGIN
  v_slug := lower(regexp_replace(coalesce(_slug,''), '[^a-z0-9-]', '', 'g'));

  -- Exact match first
  SELECT s.id, s.slug, s.name, s.is_active
    INTO v_exact
  FROM public.schools s
  WHERE s.slug = v_slug
  LIMIT 1;

  IF v_exact.id IS NOT NULL THEN
    id := v_exact.id;
    slug := v_exact.slug;
    name := v_exact.name;
    is_active := v_exact.is_active;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Prefix fallback ONLY if it matches exactly one school
  SELECT count(*) INTO v_prefix_count
  FROM public.schools s
  WHERE s.slug LIKE (v_slug || '%');

  IF v_prefix_count = 1 THEN
    RETURN QUERY
    SELECT s.id, s.slug, s.name, s.is_active
    FROM public.schools s
    WHERE s.slug LIKE (v_slug || '%')
    ORDER BY length(s.slug) ASC
    LIMIT 1;
    RETURN;
  END IF;

  -- Otherwise: no match
  RETURN;
END;
$$;

-- 2) Message reactions + pins (per-user) for admin_messages
-- Reactions are stored per user per message per emoji.
-- Pins are per user per message.

CREATE TABLE IF NOT EXISTS public.admin_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_admin_message_reactions_message_id ON public.admin_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_admin_message_reactions_user_id ON public.admin_message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_message_reactions_school_id ON public.admin_message_reactions(school_id);

CREATE TABLE IF NOT EXISTS public.admin_message_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_message_pins_message_id ON public.admin_message_pins(message_id);
CREATE INDEX IF NOT EXISTS idx_admin_message_pins_user_id ON public.admin_message_pins(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_message_pins_school_id ON public.admin_message_pins(school_id);

-- Access helper: user can access a message if they are the sender, a recipient, or staff manager.
CREATE OR REPLACE FUNCTION public.can_access_admin_message(_message_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_messages m
    WHERE m.id = _message_id
      AND (
        m.sender_user_id = auth.uid()
        OR public.can_manage_staff(m.school_id)
        OR EXISTS (
          SELECT 1
          FROM public.admin_message_recipients r
          WHERE r.message_id = m.id
            AND r.recipient_user_id = auth.uid()
        )
      )
  );
$$;

-- Enable RLS
ALTER TABLE public.admin_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_message_pins ENABLE ROW LEVEL SECURITY;

-- Policies: reactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='admin_message_reactions' AND policyname='Users can view reactions for accessible messages'
  ) THEN
    CREATE POLICY "Users can view reactions for accessible messages"
    ON public.admin_message_reactions
    FOR SELECT
    TO authenticated
    USING (
      public.can_access_admin_message(message_id)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='admin_message_reactions' AND policyname='Users can add their reactions'
  ) THEN
    CREATE POLICY "Users can add their reactions"
    ON public.admin_message_reactions
    FOR INSERT
    TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      AND public.can_access_admin_message(message_id)
      AND school_id IS NOT NULL
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='admin_message_reactions' AND policyname='Users can delete their reactions'
  ) THEN
    CREATE POLICY "Users can delete their reactions"
    ON public.admin_message_reactions
    FOR DELETE
    TO authenticated
    USING (
      user_id = auth.uid()
      AND public.can_access_admin_message(message_id)
    );
  END IF;
END;
$$;

-- Policies: pins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='admin_message_pins' AND policyname='Users can view their pins'
  ) THEN
    CREATE POLICY "Users can view their pins"
    ON public.admin_message_pins
    FOR SELECT
    TO authenticated
    USING (
      user_id = auth.uid()
      AND public.can_access_admin_message(message_id)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='admin_message_pins' AND policyname='Users can pin messages'
  ) THEN
    CREATE POLICY "Users can pin messages"
    ON public.admin_message_pins
    FOR INSERT
    TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      AND public.can_access_admin_message(message_id)
      AND school_id IS NOT NULL
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='admin_message_pins' AND policyname='Users can unpin messages'
  ) THEN
    CREATE POLICY "Users can unpin messages"
    ON public.admin_message_pins
    FOR DELETE
    TO authenticated
    USING (
      user_id = auth.uid()
      AND public.can_access_admin_message(message_id)
    );
  END IF;
END;
$$;