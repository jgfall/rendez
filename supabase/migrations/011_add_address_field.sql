-- Migration: Add address field to tour_blocks
-- Address is shown after deposit, neighborhood is shown before deposit (if not hidden)

ALTER TABLE tour_blocks
ADD COLUMN IF NOT EXISTS address TEXT;

COMMENT ON COLUMN tour_blocks.address IS 'Full address - only shown after deposit is paid';
COMMENT ON COLUMN tour_blocks.neighborhood IS 'Neighborhood/area - shown before deposit (if visibility allows)';

