-- Workouse Audit Tool D1 Database Migration: Add Story column to audit_results
-- 0004_add_story_to_audit_results.sql

ALTER TABLE audit_results ADD COLUMN story TEXT;
