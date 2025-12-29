-- Test script to verify get_public_proposal_by_slug function works
-- Run this in Supabase SQL Editor

-- Test with one of your actual slugs
SELECT get_public_proposal_by_slug('zhx0_MEsuH');

-- If that works, check if the function exists and has proper permissions
SELECT 
  proname as function_name,
  proargnames as argument_names,
  prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'get_public_proposal_by_slug';

-- Check permissions
SELECT 
  grantee, 
  privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'get_public_proposal_by_slug';

-- Verify the proposal exists and has all required relationships
SELECT 
  p.id,
  p.slug,
  p.tour_id,
  p.client_id,
  p.guide_id,
  CASE WHEN t.id IS NULL THEN 'MISSING TOUR' ELSE 'OK' END as tour_status,
  CASE WHEN c.id IS NULL THEN 'MISSING CLIENT' ELSE 'OK' END as client_status,
  CASE WHEN g.id IS NULL THEN 'MISSING GUIDE' ELSE 'OK' END as guide_status
FROM proposals p
LEFT JOIN tour_templates t ON t.id = p.tour_id
LEFT JOIN clients c ON c.id = p.client_id
LEFT JOIN profiles g ON g.id = p.guide_id
WHERE p.slug = 'zhx0_MEsuH';

