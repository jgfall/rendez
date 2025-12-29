-- Rendez Database Schema
-- Run this migration in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom types
CREATE TYPE block_visibility AS ENUM ('public', 'vague', 'secret', 'reveal');
CREATE TYPE block_type AS ENUM ('activity', 'transport', 'meal', 'free_time', 'accommodation', 'other');
CREATE TYPE proposal_status AS ENUM ('draft', 'sent', 'viewed', 'deposit_paid', 'confirmed', 'archived');
CREATE TYPE price_mode AS ENUM ('per_person', 'flat');

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tour templates table
CREATE TABLE tour_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 180,
  price_mode price_mode NOT NULL DEFAULT 'per_person',
  base_price_cents INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tour blocks table
CREATE TABLE tour_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID NOT NULL REFERENCES tour_templates(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  type block_type NOT NULL DEFAULT 'activity',
  client_title TEXT NOT NULL,
  description TEXT,
  start_offset_minutes INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  visibility block_visibility NOT NULL DEFAULT 'public',
  venue_name TEXT,
  neighborhood TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Proposals table
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES tour_templates(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL UNIQUE,
  status proposal_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  group_size INTEGER,
  total_price_cents INTEGER,
  deposit_cents INTEGER NOT NULL,
  deposit_paid_at TIMESTAMPTZ,
  manual_unlock BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tour_blocks_sort_order ON tour_blocks(tour_id, sort_order);
CREATE INDEX idx_tour_templates_guide ON tour_templates(guide_id);
CREATE INDEX idx_tour_blocks_guide ON tour_blocks(guide_id);
CREATE INDEX idx_clients_guide ON clients(guide_id);
CREATE INDEX idx_proposals_guide ON proposals(guide_id);
CREATE INDEX idx_proposals_slug ON proposals(slug);
CREATE INDEX idx_proposals_status ON proposals(status);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tour_templates_updated_at
  BEFORE UPDATE ON tour_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tour_blocks_updated_at
  BEFORE UPDATE ON tour_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for tour_templates
CREATE POLICY "Guides can view own tours"
  ON tour_templates FOR SELECT
  USING (auth.uid() = guide_id);

CREATE POLICY "Guides can insert own tours"
  ON tour_templates FOR INSERT
  WITH CHECK (auth.uid() = guide_id);

CREATE POLICY "Guides can update own tours"
  ON tour_templates FOR UPDATE
  USING (auth.uid() = guide_id);

CREATE POLICY "Guides can delete own tours"
  ON tour_templates FOR DELETE
  USING (auth.uid() = guide_id);

-- RLS Policies for tour_blocks
CREATE POLICY "Guides can view own blocks"
  ON tour_blocks FOR SELECT
  USING (auth.uid() = guide_id);

CREATE POLICY "Guides can insert own blocks"
  ON tour_blocks FOR INSERT
  WITH CHECK (auth.uid() = guide_id);

CREATE POLICY "Guides can update own blocks"
  ON tour_blocks FOR UPDATE
  USING (auth.uid() = guide_id);

CREATE POLICY "Guides can delete own blocks"
  ON tour_blocks FOR DELETE
  USING (auth.uid() = guide_id);

-- RLS Policies for clients
CREATE POLICY "Guides can view own clients"
  ON clients FOR SELECT
  USING (auth.uid() = guide_id);

CREATE POLICY "Guides can insert own clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = guide_id);

CREATE POLICY "Guides can update own clients"
  ON clients FOR UPDATE
  USING (auth.uid() = guide_id);

CREATE POLICY "Guides can delete own clients"
  ON clients FOR DELETE
  USING (auth.uid() = guide_id);

-- RLS Policies for proposals (guides only - public access via RPC)
CREATE POLICY "Guides can view own proposals"
  ON proposals FOR SELECT
  USING (auth.uid() = guide_id);

CREATE POLICY "Guides can insert own proposals"
  ON proposals FOR INSERT
  WITH CHECK (auth.uid() = guide_id);

CREATE POLICY "Guides can update own proposals"
  ON proposals FOR UPDATE
  USING (auth.uid() = guide_id);

CREATE POLICY "Guides can delete own proposals"
  ON proposals FOR DELETE
  USING (auth.uid() = guide_id);

-- Public proposal RPC function (enforces unlock rules server-side)
CREATE OR REPLACE FUNCTION get_public_proposal_by_slug(slug_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  proposal_record RECORD;
  tour_record RECORD;
  client_record RECORD;
  guide_record RECORD;
  blocks_json JSONB;
  is_unlocked BOOLEAN;
BEGIN
  -- Fetch the proposal
  SELECT * INTO proposal_record
  FROM proposals
  WHERE slug = slug_param;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Determine if proposal is unlocked
  is_unlocked := (proposal_record.deposit_paid_at IS NOT NULL) OR (proposal_record.manual_unlock = TRUE);

  -- Fetch related tour
  SELECT name, city, duration_minutes, description, cover_image_url
  INTO tour_record
  FROM tour_templates
  WHERE id = proposal_record.tour_id;

  -- Fetch client name
  SELECT name INTO client_record
  FROM clients
  WHERE id = proposal_record.client_id;

  -- Fetch guide name
  SELECT full_name INTO guide_record
  FROM profiles
  WHERE id = proposal_record.guide_id;

  -- Fetch and sanitize blocks based on unlock status
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'sort_order', b.sort_order,
      'type', b.type,
      'client_title', b.client_title,
      'description', CASE
        WHEN b.visibility = 'secret' AND NOT is_unlocked THEN NULL
        ELSE b.description
      END,
      'start_offset_minutes', b.start_offset_minutes,
      'image_url', CASE
        WHEN b.visibility = 'secret' AND NOT is_unlocked THEN NULL
        ELSE b.image_url
      END,
      'visibility', b.visibility,
      'venue_name', CASE
        WHEN b.visibility IN ('secret', 'reveal') AND NOT is_unlocked THEN NULL
        WHEN b.visibility = 'vague' THEN NULL
        ELSE b.venue_name
      END,
      'neighborhood', CASE
        WHEN b.visibility IN ('secret', 'reveal') AND NOT is_unlocked THEN NULL
        ELSE b.neighborhood
      END,
      'lat', CASE
        WHEN b.visibility IN ('secret', 'reveal', 'vague') AND NOT is_unlocked THEN NULL
        ELSE b.lat
      END,
      'lng', CASE
        WHEN b.visibility IN ('secret', 'reveal', 'vague') AND NOT is_unlocked THEN NULL
        ELSE b.lng
      END
    ) ORDER BY b.sort_order
  ), '[]'::jsonb) INTO blocks_json
  FROM tour_blocks b
  WHERE b.tour_id = proposal_record.tour_id;

  -- Return sanitized proposal data
  RETURN jsonb_build_object(
    'id', proposal_record.id,
    'slug', proposal_record.slug,
    'status', proposal_record.status,
    'scheduled_at', proposal_record.scheduled_at,
    'group_size', proposal_record.group_size,
    'total_price_cents', proposal_record.total_price_cents,
    'deposit_cents', proposal_record.deposit_cents,
    'is_unlocked', is_unlocked,
    'tour', jsonb_build_object(
      'name', tour_record.name,
      'city', tour_record.city,
      'duration_minutes', tour_record.duration_minutes,
      'description', tour_record.description,
      'cover_image_url', tour_record.cover_image_url
    ),
    'client', jsonb_build_object(
      'name', client_record.name
    ),
    'blocks', blocks_json,
    'guide', jsonb_build_object(
      'full_name', guide_record.full_name
    )
  );
END;
$$;

-- Grant execute permission on the RPC function to anonymous users
GRANT EXECUTE ON FUNCTION get_public_proposal_by_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_proposal_by_slug(TEXT) TO authenticated;

-- Function to update proposal status (for webhook use with service role)
CREATE OR REPLACE FUNCTION update_proposal_payment(
  proposal_id_param UUID,
  checkout_session_id TEXT,
  payment_intent_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE proposals
  SET
    deposit_paid_at = NOW(),
    status = 'deposit_paid',
    stripe_checkout_session_id = checkout_session_id,
    stripe_payment_intent_id = payment_intent_id,
    updated_at = NOW()
  WHERE id = proposal_id_param
    AND deposit_paid_at IS NULL; -- Idempotency check
END;
$$;

-- Function to mark proposal as viewed
CREATE OR REPLACE FUNCTION mark_proposal_viewed(slug_param TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE proposals
  SET status = 'viewed', updated_at = NOW()
  WHERE slug = slug_param
    AND status IN ('draft', 'sent');
END;
$$;

GRANT EXECUTE ON FUNCTION mark_proposal_viewed(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION mark_proposal_viewed(TEXT) TO authenticated;

