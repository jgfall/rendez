-- Migration: Add availability system for guides

-- Create availability table to track guide's available time slots
CREATE TABLE IF NOT EXISTS guide_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(guide_id, date, start_time)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guide_availability_guide_date ON guide_availability(guide_id, date);
CREATE INDEX IF NOT EXISTS idx_guide_availability_date ON guide_availability(date);

-- Enable RLS
ALTER TABLE guide_availability ENABLE ROW LEVEL SECURITY;

-- Policy: Guides can manage their own availability
CREATE POLICY "Guides can manage their own availability"
  ON guide_availability
  FOR ALL
  USING (auth.uid() = guide_id);

-- Policy: Anyone can read availability (for booking)
CREATE POLICY "Anyone can read availability"
  ON guide_availability
  FOR SELECT
  USING (is_available = true);

-- Function to get available time slots for a guide in a date range
CREATE OR REPLACE FUNCTION get_guide_availability(
  guide_id_param UUID,
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  date DATE,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.date,
    a.start_time,
    a.end_time,
    a.is_available
  FROM guide_availability a
  WHERE a.guide_id = guide_id_param
    AND a.date >= start_date
    AND a.date <= end_date
    AND a.is_available = true
  ORDER BY a.date, a.start_time;
END;
$$;

GRANT EXECUTE ON FUNCTION get_guide_availability(UUID, DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION get_guide_availability(UUID, DATE, DATE) TO authenticated;

