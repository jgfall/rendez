-- Migration: Add proposal_blocks table for customizing proposals from templates

-- Proposal blocks table (allows customizing blocks per proposal)
CREATE TABLE IF NOT EXISTS proposal_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  type block_type NOT NULL DEFAULT 'activity',
  client_title TEXT NOT NULL,
  description TEXT,
  teaser_description TEXT,
  start_offset_minutes INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  visibility block_visibility NOT NULL DEFAULT 'reveal',
  venue_name TEXT,
  neighborhood TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposal_blocks_proposal ON proposal_blocks(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_blocks_sort_order ON proposal_blocks(proposal_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_proposal_blocks_guide ON proposal_blocks(guide_id);

-- Updated at trigger
CREATE TRIGGER update_proposal_blocks_updated_at
  BEFORE UPDATE ON proposal_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE proposal_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guides can view own proposal blocks"
  ON proposal_blocks FOR SELECT
  USING (auth.uid() = guide_id);

CREATE POLICY "Guides can insert own proposal blocks"
  ON proposal_blocks FOR INSERT
  WITH CHECK (auth.uid() = guide_id);

CREATE POLICY "Guides can update own proposal blocks"
  ON proposal_blocks FOR UPDATE
  USING (auth.uid() = guide_id);

CREATE POLICY "Guides can delete own proposal blocks"
  ON proposal_blocks FOR DELETE
  USING (auth.uid() = guide_id);

-- Update get_public_proposal_by_slug to use proposal_blocks if they exist, otherwise tour_blocks
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
  has_custom_blocks BOOLEAN;
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

  -- Check if proposal has custom blocks
  SELECT EXISTS(SELECT 1 FROM proposal_blocks WHERE proposal_id = proposal_record.id) INTO has_custom_blocks;

  -- Fetch related tour
  SELECT name, city, duration_minutes, description, cover_image_url
  INTO tour_record
  FROM tour_templates
  WHERE id = proposal_record.tour_id;

  -- Fetch client name
  SELECT name INTO client_record
  FROM clients
  WHERE id = proposal_record.client_id;

  -- Fetch guide profile with business info
  SELECT full_name, business_name, logo_url, bio
  INTO guide_record
  FROM profiles
  WHERE id = proposal_record.guide_id;

  -- Fetch and sanitize blocks based on unlock status
  -- Use proposal_blocks if they exist, otherwise use tour_blocks
  IF has_custom_blocks THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'sort_order', b.sort_order,
        'type', b.type,
        'client_title', b.client_title,
        'description', CASE
          WHEN b.visibility = 'secret' AND NOT is_unlocked THEN NULL
          WHEN b.visibility = 'reveal' AND NOT is_unlocked AND b.teaser_description IS NOT NULL THEN b.teaser_description
          WHEN b.visibility = 'reveal' AND NOT is_unlocked THEN NULL
          ELSE b.description
        END,
        'start_offset_minutes', b.start_offset_minutes,
        'image_url', CASE
          WHEN b.visibility = 'secret' AND NOT is_unlocked THEN NULL
          WHEN b.visibility = 'reveal' AND NOT is_unlocked THEN NULL
          ELSE b.image_url
        END,
      'visibility', b.visibility,
      'venue_name', NULL, -- Always NULL - venue_name is internal only, never shown to clients
      'neighborhood', CASE
        WHEN b.visibility IN ('secret', 'reveal') AND NOT is_unlocked THEN NULL
        ELSE b.neighborhood
      END
      ) ORDER BY b.sort_order
    ), '[]'::jsonb) INTO blocks_json
    FROM proposal_blocks b
    WHERE b.proposal_id = proposal_record.id;
  ELSE
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'sort_order', b.sort_order,
        'type', b.type,
        'client_title', b.client_title,
        'description', CASE
          WHEN b.visibility = 'secret' AND NOT is_unlocked THEN NULL
          WHEN b.visibility = 'reveal' AND NOT is_unlocked AND b.teaser_description IS NOT NULL THEN b.teaser_description
          WHEN b.visibility = 'reveal' AND NOT is_unlocked THEN NULL
          ELSE b.description
        END,
        'start_offset_minutes', b.start_offset_minutes,
        'image_url', CASE
          WHEN b.visibility = 'secret' AND NOT is_unlocked THEN NULL
          WHEN b.visibility = 'reveal' AND NOT is_unlocked THEN NULL
          ELSE b.image_url
        END,
      'visibility', b.visibility,
      'venue_name', NULL, -- Always NULL - venue_name is internal only, never shown to clients
      'neighborhood', CASE
        WHEN b.visibility IN ('secret', 'reveal') AND NOT is_unlocked THEN NULL
        ELSE b.neighborhood
      END
      ) ORDER BY b.sort_order
    ), '[]'::jsonb) INTO blocks_json
    FROM tour_blocks b
    WHERE b.tour_id = proposal_record.tour_id;
  END IF;

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
      'full_name', guide_record.full_name,
      'business_name', guide_record.business_name,
      'logo_url', guide_record.logo_url,
      'bio', guide_record.bio
    )
  );
END;
$$;

