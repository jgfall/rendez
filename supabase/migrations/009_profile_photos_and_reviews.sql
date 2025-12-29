-- Add profile photo to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(proposal_id) -- One review per proposal
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reviews_guide_id ON reviews(guide_id);
CREATE INDEX IF NOT EXISTS idx_reviews_proposal_id ON reviews(proposal_id);

-- Add updated_at trigger for reviews
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
-- Guides can view reviews about themselves
CREATE POLICY "Guides can view own reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = guide_id);

-- Clients can view reviews for guides they've worked with
-- (This is handled via proposal relationship)
CREATE POLICY "Clients can view reviews for their proposals"
  ON reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = reviews.proposal_id
      AND proposals.client_id IN (
        SELECT id FROM clients WHERE guide_id = auth.uid()
      )
    )
  );

-- Public can view reviews (for displaying ratings)
CREATE POLICY "Public can view reviews"
  ON reviews FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only authenticated users can insert reviews (clients who completed tours)
CREATE POLICY "Authenticated users can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = reviews.proposal_id
      AND proposals.deposit_paid_at IS NOT NULL
      AND proposals.client_id IN (
        SELECT id FROM clients WHERE guide_id = auth.uid()
      )
    )
  );

-- Function to calculate average rating for a guide
CREATE OR REPLACE FUNCTION get_guide_rating(guide_id_param UUID)
RETURNS TABLE (
  average_rating NUMERIC,
  review_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as average_rating,
    COUNT(*)::bigint as review_count
  FROM reviews
  WHERE guide_id = guide_id_param;
END;
$$;

GRANT EXECUTE ON FUNCTION get_guide_rating(UUID) TO authenticated, anon;

-- Update get_public_proposal_by_slug to include profile photo and rating
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
  guide_rating RECORD;
  blocks_source TEXT;
  blocks_count INTEGER;
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

  -- Fetch guide profile with business info and photo
  SELECT full_name, business_name, logo_url, bio, profile_photo_url
  INTO guide_record
  FROM profiles
  WHERE id = proposal_record.guide_id;

  -- Get guide rating
  SELECT * INTO guide_rating
  FROM get_guide_rating(proposal_record.guide_id);

  -- Determine if proposal has custom blocks
  SELECT COUNT(*) INTO blocks_count FROM proposal_blocks WHERE proposal_id = proposal_record.id;
  IF blocks_count > 0 THEN
    blocks_source := 'proposal_blocks';
  ELSE
    blocks_source := 'tour_blocks';
  END IF;

  -- Fetch and sanitize blocks based on unlock status and source
  IF blocks_source = 'proposal_blocks' THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'sort_order', b.sort_order,
        'type', b.type,
        'client_title', b.client_title,
        'description', CASE
          WHEN b.visibility = 'secret' AND NOT is_unlocked THEN NULL
          WHEN b.visibility = 'reveal' AND NOT is_unlocked THEN b.teaser_description
          ELSE b.description
        END,
        'teaser_description', b.teaser_description,
        'start_offset_minutes', b.start_offset_minutes,
        'image_url', CASE
          WHEN b.visibility = 'secret' AND NOT is_unlocked THEN NULL
          WHEN b.visibility = 'reveal' AND NOT is_unlocked THEN NULL
          ELSE b.image_url
        END,
        'visibility', b.visibility,
        'venue_name', NULL,
        'neighborhood', CASE
          WHEN b.visibility IN ('secret', 'reveal') AND NOT is_unlocked THEN NULL
          ELSE b.neighborhood
        END,
        'lat', NULL,
        'lng', NULL
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
          WHEN b.visibility = 'reveal' AND NOT is_unlocked THEN b.teaser_description
          ELSE b.description
        END,
        'teaser_description', b.teaser_description,
        'start_offset_minutes', b.start_offset_minutes,
        'image_url', CASE
          WHEN b.visibility = 'secret' AND NOT is_unlocked THEN NULL
          WHEN b.visibility = 'reveal' AND NOT is_unlocked THEN NULL
          ELSE b.image_url
        END,
        'visibility', b.visibility,
        'venue_name', NULL,
        'neighborhood', CASE
          WHEN b.visibility IN ('secret', 'reveal') AND NOT is_unlocked THEN NULL
          ELSE b.neighborhood
        END,
        'lat', NULL,
        'lng', NULL
      ) ORDER BY b.sort_order
    ), '[]'::jsonb) INTO blocks_json
    FROM tour_blocks b
    WHERE b.tour_id = proposal_record.tour_id;
  END IF;

  -- Return sanitized proposal data with business info, photo, and rating
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
      'bio', guide_record.bio,
      'profile_photo_url', guide_record.profile_photo_url,
      'average_rating', guide_rating.average_rating,
      'review_count', guide_rating.review_count
    )
  );
END;
$$;

COMMENT ON COLUMN profiles.profile_photo_url IS 'URL to the guide profile photo';
COMMENT ON TABLE reviews IS 'Client reviews and ratings for completed tours';

