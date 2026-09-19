ifndef DEP_ENV
$(error DEP_ENV is not set)
endif


# Permanent local overrides
-include ../.env.$(DEP_ENV)

# Set environment variables from your shell or .env.$(DEP_ENV)
export ACR_URI ?= registry.example.com
export ACR_USER ?= your-registry-user
export ACR_PASSWD ?= your-registry-password
export TIMESTAMP=`date -u +"%Y-%m-%dT%H:%M:%SZ"`

build-app:
	TIMESTAMP=$(TIMESTAMP) \
	VERSION=$(VERSION) \
	docker compose -f ../docker-compose.$(DEP_ENV).yml --env-file ../.env.$(DEP_ENV) build --no-cache

push-app:
	docker login $(ACR_URI) --username $(ACR_USER) --password $(ACR_PASSWD)
	docker compose -f ../docker-compose.$(DEP_ENV).yml --env-file ../.env.$(DEP_ENV) push

build-n-push:
	make build-app
	make push-app

env:
	@echo Version: $(VERSION)
