-- Paint estimates should not silently inflate theoretical litres with a
-- generic 10% construction-waste factor. Preserve the optional user control;
-- container purchase rounding remains a separate step in the calculator.
UPDATE estimation_calc_rules
SET rule_value = '{"value": 0}'::jsonb,
    description = 'Default additional paint allowance percentage. Zero by default; users may add an optional site-specific allowance.'
WHERE rule_key = 'default_waste_margin_pct'
  AND calculator_type = 'painting';

UPDATE estimation_calc_rules
SET rule_value = '{"value": [0, 1, 2, 5]}'::jsonb,
    description = 'Optional paint allowance presets (percent); zero is the default.'
WHERE rule_key = 'waste_margin_options'
  AND calculator_type = 'painting';
