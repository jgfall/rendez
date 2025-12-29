-- Business Profile Fields Migration
-- Adds business identity fields for tour guide companies

-- Create business stage enum
CREATE TYPE business_stage AS ENUM ('just_starting', 'established');

-- Add business profile fields to profiles table
ALTER TABLE profiles
ADD COLUMN business_name TEXT,
ADD COLUMN logo_url TEXT,
ADD COLUMN business_stage business_stage,
ADD COLUMN website_url TEXT,
ADD COLUMN phone TEXT,
ADD COLUMN bio TEXT,
ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Update the get_public_proposal_by_slug function to include business info
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
        ELSE b.description
      END,
      'start_offset_minutes', b.start_offset_minutes,
      'image_url', CASE
        WHEN b.visibility = 'secret' AND NOT is_unlocked THEN NULL
        ELSE b.image_url
      END,
      'visibility', b.visibility,
      'venue_name', NULL, -- Always NULL - venue_name is internal only, never shown to clients
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

  -- Return sanitized proposal data with business info
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

-- Create storage bucket for logos (run this in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

COMMENT ON COLUMN profiles.business_name IS 'The display name for the tour company/guide business';
COMMENT ON COLUMN profiles.logo_url IS 'URL to the business logo image';
COMMENT ON COLUMN profiles.business_stage IS 'Whether the guide is just starting or has an established business';
COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether the user has completed the full onboarding flow';

