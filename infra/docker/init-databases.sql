-- =============================================================================
-- Tabeliao - Database Initialization
-- Creates schemas for each microservice within the shared database
-- This script runs automatically on first PostgreSQL container start
-- =============================================================================

-- Create test database for integration tests
SELECT 'CREATE DATABASE tabeliao_db_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'tabeliao_db_test')\gexec

-- ---------------------------------------------------------------------------
-- Service-specific schemas
-- Each microservice owns its own schema for data isolation
-- ---------------------------------------------------------------------------

-- API Gateway: API keys, audit logs, rate limit state
CREATE SCHEMA IF NOT EXISTS gateway;
COMMENT ON SCHEMA gateway IS 'API Gateway - routing, auth, rate limiting';

-- Auth Service: users, sessions, roles, permissions, Gov.br tokens
CREATE SCHEMA IF NOT EXISTS auth;
COMMENT ON SCHEMA auth IS 'Auth Service - users, sessions, Gov.br OAuth';

-- Contract Service: contracts, templates, clauses, signatures, versions
CREATE SCHEMA IF NOT EXISTS contract;
COMMENT ON SCHEMA contract IS 'Contract Service - contracts, templates, signing workflows';

-- AI Service: prompt templates, analysis history, usage metrics
CREATE SCHEMA IF NOT EXISTS ai;
COMMENT ON SCHEMA ai IS 'AI Service - analysis history, prompt management';

-- Blockchain Service: tx logs, event history, contract mappings
CREATE SCHEMA IF NOT EXISTS blockchain;
COMMENT ON SCHEMA blockchain IS 'Blockchain Service - on-chain registrations, escrow';

-- Payment Service: transactions, invoices, escrow ledger
CREATE SCHEMA IF NOT EXISTS payment;
COMMENT ON SCHEMA payment IS 'Payment Service - PIX, Stripe, escrow';

-- Notification Service: notification logs, templates, delivery status
CREATE SCHEMA IF NOT EXISTS notification;
COMMENT ON SCHEMA notification IS 'Notification Service - email, WhatsApp, SMS, push';

-- Dispute Service: disputes, evidence, arbitration sessions
CREATE SCHEMA IF NOT EXISTS dispute;
COMMENT ON SCHEMA dispute IS 'Dispute Service - arbitration, mediation, evidence';

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ---------------------------------------------------------------------------
-- Grant schema access to the tabeliao user
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    schema_name TEXT;
BEGIN
    FOR schema_name IN
        SELECT unnest(ARRAY['gateway', 'auth', 'contract', 'ai', 'blockchain', 'payment', 'notification', 'dispute'])
    LOOP
        EXECUTE format('GRANT ALL PRIVILEGES ON SCHEMA %I TO tabeliao', schema_name);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL PRIVILEGES ON TABLES TO tabeliao', schema_name);
        EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL PRIVILEGES ON SEQUENCES TO tabeliao', schema_name);
    END LOOP;
END
$$;

-- Confirmation
DO $$ BEGIN RAISE NOTICE 'Tabeliao database initialized: 8 schemas created, extensions enabled.'; END $$;
