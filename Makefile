# Workouse Audit Tool — Development & Deployment Automation Makefile

SHELL := /bin/bash
NVM_EXEC := source ~/.nvm/nvm.sh && nvm use

.PHONY: help dev build check test preview db-init-local db-init-prod db-migrate-local db-migrate-prod deploy clean

help:
	@echo "Workouse Audit Tool Available Commands:"
	@echo "  make dev               - Start local Astro development server"
	@echo "  make build             - Build hybrid production bundle"
	@echo "  make check             - Run Astro & TypeScript type checking"
	@echo "  make test              - Run unit test suite"
	@echo "  make preview           - Preview production build locally"
	@echo "  make db-init-local     - Execute full schema.sql on local D1 SQLite"
	@echo "  make db-init-prod      - Execute full schema.sql on remote production D1"
	@echo "  make db-migrate-local  - Apply D1 schema migrations locally"
	@echo "  make db-migrate-prod   - Apply D1 schema migrations to remote D1"
	@echo "  make deploy            - Run type check, build, and deploy to Cloudflare Workers"
	@echo "  make clean             - Remove build caches (dist, .astro, .wrangler)"

dev:
	bash -c "$(NVM_EXEC) && npm run dev"

build:
	bash -c "$(NVM_EXEC) && npm run build"

check:
	bash -c "$(NVM_EXEC) && npx tsc --noEmit"

test:
	bash -c "$(NVM_EXEC) && node --experimental-strip-types test/url-validator.test.ts && node --experimental-strip-types test/jurisdiction-engine.test.ts && node --experimental-strip-types test/ucp-detection.test.ts && node --experimental-strip-types test/nostr-auth.test.ts"


preview:
	bash -c "$(NVM_EXEC) && npm run preview"

db-init-local:
	bash -c "$(NVM_EXEC) && npx wrangler d1 execute workouse-db --local --file=src/db/schema.sql --yes"

db-init-prod:
	bash -c "$(NVM_EXEC) && npx wrangler d1 execute workouse-db --remote --file=src/db/schema.sql --yes"

db-migrate-local:
	bash -c "$(NVM_EXEC) && npx wrangler d1 migrations apply workouse-db --local"

db-migrate-prod:
	bash -c "$(NVM_EXEC) && npx wrangler d1 migrations apply workouse-db --remote"

deploy: check build
	bash -c "$(NVM_EXEC) && npx wrangler deploy"

clean:
	rm -rf dist .astro .wrangler
