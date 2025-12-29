-- Migration: Tour template and block improvements
-- Adds duration to blocks, pre/post-deposit fields, and time-bound scheduling

-- Add duration_minutes to tour_blocks (replaces start_offset_minutes calculation)
ALTER TABLE tour_blocks 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 60;

-- Add fields for pre/post-deposit visibility
ALTER TABLE tour_blocks
ADD COLUMN IF NOT EXISTS hide_until_deposit BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pre_deposit_title TEXT,
ADD COLUMN IF NOT EXISTS pre_deposit_description TEXT,
ADD COLUMN IF NOT EXISTS post_deposit_title TEXT,
ADD COLUMN IF NOT EXISTS post_deposit_description TEXT;

-- Add time-bound scheduling to tour_templates
ALTER TABLE tour_templates
ADD COLUMN IF NOT EXISTS is_time_bound BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS allowed_days_of_week INTEGER[], -- Array of day numbers (0=Sunday, 1=Monday, etc.)
ADD COLUMN IF NOT EXISTS preferred_start_time TIME; -- Preferred start time for time-bound tours

-- Migrate existing data: calculate duration from start_offset_minutes
-- For blocks, we'll set a default duration of 60 minutes
-- The actual duration should be calculated based on the difference between consecutive blocks
-- This is a simple migration - actual duration calculation will be done in the UI
UPDATE tour_blocks
SET duration_minutes = 60
WHERE duration_minutes IS NULL OR duration_minutes = 0;

-- Add comment for clarity
COMMENT ON COLUMN tour_blocks.duration_minutes IS 'Duration of this block in minutes';
COMMENT ON COLUMN tour_blocks.hide_until_deposit IS 'If true, show pre_deposit fields before deposit, post_deposit fields after';
COMMENT ON COLUMN tour_blocks.pre_deposit_title IS 'Title shown before deposit is paid (if hide_until_deposit is true)';
COMMENT ON COLUMN tour_blocks.pre_deposit_description IS 'Description shown before deposit is paid (if hide_until_deposit is true)';
COMMENT ON COLUMN tour_blocks.post_deposit_title IS 'Title shown after deposit is paid (if hide_until_deposit is true)';
COMMENT ON COLUMN tour_blocks.post_deposit_description IS 'Description shown after deposit is paid (if hide_until_deposit is true)';
COMMENT ON COLUMN tour_templates.is_time_bound IS 'If true, this tour can only be scheduled on specific days/times';
COMMENT ON COLUMN tour_templates.allowed_days_of_week IS 'Array of day numbers (0=Sunday, 1=Monday, ..., 6=Saturday). NULL means any day.';
COMMENT ON COLUMN tour_templates.preferred_start_time IS 'Preferred start time for time-bound tours';

