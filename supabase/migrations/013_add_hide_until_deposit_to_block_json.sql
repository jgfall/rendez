-- Migration: Add hide_until_deposit field to block JSON output
-- This allows the frontend to detect which blocks are hidden until deposit

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
  guide_rating RECORD;
  blocks_json JSONB;
  is_unlocked BOOLEAN;
  blocks_source TEXT;
  has_custom_blocks BOOLEAN;
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
        'client_title', CASE
          -- For hide_until_deposit blocks, use pre/post deposit titles
          WHEN b.hide_until_deposit AND NOT is_unlocked THEN COALESCE(b.pre_deposit_title, b.client_title)
          WHEN b.hide_until_deposit AND is_unlocked THEN COALESCE(b.post_deposit_title, b.client_title)
          -- Legacy visibility system
          WHEN b.visibility = 'secret' AND NOT is_unlocked THEN NULL
          ELSE b.client_title
        END,
        'description', CASE
          -- For hide_until_deposit blocks, use pre/post deposit descriptions
          WHEN b.hide_until_deposit AND NOT is_unlocked THEN b.pre_deposit_description
          WHEN b.hide_until_deposit AND is_unlocked THEN COALESCE(b.post_deposit_description, b.description)
          -- Legacy visibility system
          WHEN b.visibility = 'secret' AND NOT is_unlocked THEN NULL
          WHEN b.visibility = 'reveal' AND NOT is_unlocked THEN COALESCE(b.teaser_description, NULL)
          ELSE b.description
        END,
        'start_offset_minutes', b.start_offset_minutes,
        'image_url', CASE
          WHEN b.hide_until_deposit AND NOT is_unlocked THEN NULL
          WHEN b.visibility = 'secret' AND NOT is_unlocked THEN NULL
          WHEN b.visibility = 'reveal' AND NOT is_unlocked THEN NULL
          ELSE b.image_url
        END,
        'visibility', b.visibility,
        'hide_until_deposit', b.hide_until_deposit,
        'venue_name', NULL, -- Always NULL - venue_name is internal only
        'neighborhood', CASE
          WHEN b.hide_until_deposit AND NOT is_unlocked THEN NULL
          WHEN b.visibility IN ('secret', 'reveal') AND NOT is_unlocked THEN NULL
          ELSE b.neighborhood
        END,
        'address', CASE
          WHEN b.hide_until_deposit AND NOT is_unlocked THEN NULL
          WHEN b.visibility IN ('secret', 'reveal') AND NOT is_unlocked THEN NULL
          ELSE b.address
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
        'client_title', CASE
          -- For hide_until_deposit blocks, use pre/post deposit titles
          WHEN b.hide_until_deposit AND NOT is_unlocked THEN COALESCE(b.pre_deposit_title, b.client_title)
          WHEN b.hide_until_deposit AND is_unlocked THEN COALESCE(b.post_deposit_title, b.client_title)
          -- Legacy visibility system
          WHEN b.visibility = 'secret' AND NOT is_unlocked THEN NULL
          ELSE b.client_title
        END,
        'description', CASE
          -- For hide_until_deposit blocks, use pre/post deposit descriptions
          WHEN b.hide_until_deposit AND NOT is_unlocked THEN b.pre_deposit_description
          WHEN b.hide_until_deposit AND is_unlocked THEN COALESCE(b.post_deposit_description, b.description)
          -- Legacy visibility system
          WHEN b.visibility = 'secret' AND NOT is_unlocked THEN NULL
          WHEN b.visibility = 'reveal' AND NOT is_unlocked THEN COALESCE(b.teaser_description, NULL)
          ELSE b.description
        END,
        'start_offset_minutes', b.start_offset_minutes,
        'image_url', CASE
          WHEN b.hide_until_deposit AND NOT is_unlocked THEN NULL
          WHEN b.visibility = 'secret' AND NOT is_unlocked THEN NULL
          WHEN b.visibility = 'reveal' AND NOT is_unlocked THEN NULL
          ELSE b.image_url
        END,
        'visibility', b.visibility,
        'hide_until_deposit', b.hide_until_deposit,
        'venue_name', NULL, -- Always NULL - venue_name is internal only
        'neighborhood', CASE
          WHEN b.hide_until_deposit AND NOT is_unlocked THEN NULL
          WHEN b.visibility IN ('secret', 'reveal') AND NOT is_unlocked THEN NULL
          ELSE b.neighborhood
        END,
        'address', CASE
          WHEN b.hide_until_deposit AND NOT is_unlocked THEN NULL
          WHEN b.visibility IN ('secret', 'reveal') AND NOT is_unlocked THEN NULL
          ELSE b.address
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

