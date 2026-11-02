-- =========================================================
-- Add 'wall_finishing' to user_projects project_type values
-- (WallFinishEstimator local projects sync with this type)
-- =========================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_projects_project_type_check'
  ) THEN
    ALTER TABLE user_projects
    DROP CONSTRAINT user_projects_project_type_check;
    ALTER TABLE user_projects
    ADD CONSTRAINT user_projects_project_type_check
    CHECK (project_type IN (
      'screeding', 'paint_calc', 'cost_estimate', 'ai_recommendation',
      'custom', 'pop_ceiling', 'pop_estimate', 'tile', 'tile_estimate',
      'wall_finishing'
    ));
  END IF;
END $$;
