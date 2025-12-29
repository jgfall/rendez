-- Migration: Update pricing to whole numbers, add teaser_description, remove lat/lng

-- Add teaser_description to tour_blocks
ALTER TABLE tour_blocks 
ADD COLUMN IF NOT EXISTS teaser_description TEXT;

-- Change default visibility to 'reveal' for new blocks
-- (We'll handle this in application code, but note it here)

-- Note: We're keeping the _cents column names for now to avoid breaking changes
-- but we'll treat them as whole numbers in the application
-- In a future migration, we could rename them, but for now we'll just change the logic

-- Remove lat/lng columns (optional - we can just ignore them in the UI)
-- ALTER TABLE tour_blocks DROP COLUMN IF EXISTS lat;
-- ALTER TABLE tour_blocks DROP COLUMN IF EXISTS lng;
-- Actually, let's keep them in the DB but just not show them in the UI

-- Update the get_public_proposal_by_slug function to handle teaser_description
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

  -- Fetch guide profile with business info
  SELECT full_name, business_name, logo_url, bio
  INTO guide_record
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
      -- Removed lat and lng from output
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
      'full_name', guide_record.full_name,
      'business_name', guide_record.business_name,
      'logo_url', guide_record.logo_url,
      'bio', guide_record.bio
    )
  );
END;
$$;

