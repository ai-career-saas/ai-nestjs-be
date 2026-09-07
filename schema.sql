-- ============================================================
-- AI Career SaaS - Database Schema
-- Run this in your PostgreSQL / Supabase SQL editor
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Plans
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  price_inr INT NOT NULL DEFAULT 0,
  description TEXT,
  stripe_price_id VARCHAR(100),
  quota JSONB NOT NULL DEFAULT '{"analyze": 5, "interview_gen": 5}',
  features JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Subscriptions (1 active per user)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id),
  stripe_subscription_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Usage Logs (per feature, per month)
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  feature VARCHAR(50) NOT NULL,
  period DATE NOT NULL,
  count INT DEFAULT 0,
  UNIQUE(user_id, feature, period)
);

-- ── Seed Plans ──────────────────────────────────────────────────────

INSERT INTO plans (name, price_inr, description, stripe_price_id, quota, features)
VALUES
  (
    'Free',
    0,
    'Get started with AI career tools',
    NULL,
    '{"analyze": 3, "interview_gen": 3}',
    '["3 Career Analyses/mo", "3 Interview Prep sessions/mo", "Unlimited ATS Resume Scores", "Basic roadmap"]'
  ),
  (
    'Pro',
    499,
    'For serious job seekers',
    'plan_REPLACE_WITH_STRIPE_ID',
    '{"analyze": 30, "interview_gen": 30}',
    '["30 Career Analyses/mo", "30 Interview Prep sessions/mo", "Unlimited ATS Resume Scores", "Detailed roadmaps", "Market insights", "Priority support"]'
  ),
  (
    'Premium',
    999,
    'Unlimited AI career coaching',
    'plan_REPLACE_WITH_STRIPE_ID',
    '{"analyze": 999, "interview_gen": 999}',
    '["Unlimited analyses", "Unlimited Interview Prep", "Unlimited ATS Resume Scores", "Advanced roadmaps", "Salary insights", "1-on-1 AI coaching", "Priority support"]'
  )
ON CONFLICT (name) DO NOTHING;

-- Make the change effective for databases that already have seeded plans.
UPDATE plans
SET quota = quota - 'ats_score',
    features = (
      SELECT COALESCE(jsonb_agg(feature), '[]'::jsonb)
      FROM jsonb_array_elements_text(features) AS feature
      WHERE feature NOT ILIKE '%ATS%Score%'
    ) || '["Unlimited ATS Resume Scores"]'::jsonb;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_feature ON usage_logs(user_id, feature, period);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
