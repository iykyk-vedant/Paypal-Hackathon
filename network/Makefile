.DEFAULT_GOAL := doctor

export MSYS_NO_PATHCONV=1

ifeq ($(OS),Windows_NT)
    SHELL := C:/Program Files/Git/bin/bash.exe
    .SHELLFLAGS := -c
else
    SHELL := /bin/bash
    .SHELLFLAGS := -c
endif

.PHONY: doctor up down redeploy-cc stop-jurb start-jurb up-app down-app logs trail smoke reset-demo demo test-cc

doctor:
	@echo "Checking environment prerequisites..."
	@which docker >/dev/null 2>&1 || (echo "ERROR: docker is not installed or not in PATH"; exit 1)
	@docker compose version >/dev/null 2>&1 || (echo "ERROR: docker compose is not available"; exit 1)
	@which go >/dev/null 2>&1 || (echo "ERROR: go is not installed"; exit 1)
	@which node >/dev/null 2>&1 || (echo "ERROR: node is not installed"; exit 1)
	@which jq >/dev/null 2>&1 || (echo "ERROR: jq is not installed"; exit 1)
	@uname -r 2>/dev/null | grep -qiE 'microsoft|wsl' || (echo "ERROR: Host kernel must be WSL2/Linux matching microsoft|WSL. Remedy: run inside WSL2 environment."; exit 1)
	@pwd | grep -vqE '^/(mnt/|[cdCD]/)' || (echo "ERROR: Repository path starts with Windows mount ($$(pwd)). Remedy: clone inside the WSL filesystem, e.g. ~/payfabric"; exit 1)
	@echo "SUCCESS: Environment prerequisites satisfied (WSL filesystem, Linux kernel, Docker, Docker Compose, Go, Node, JQ)."

up:
	@echo "Starting consortium network and deploying CCAAS chaincode..."
	@"$(SHELL)" ./network/scripts/deploy-network.sh up

down:
	@echo "Tearing down consortium network, CCAAS, and API containers..."
	@"$(SHELL)" ./network/scripts/deploy-network.sh down

redeploy-cc:
	@echo "Redeploying chaincode with bumped sequence..."
	@"$(SHELL)" ./network/scripts/redeploy-cc.sh

up-app:
	@echo "Preparing wallets and starting member node APIs..."
	@"$(SHELL)" ./network/scripts/setup-wallets.sh
	@if docker images settlement-api:local | grep -q "settlement-api"; then \
		docker compose -f docker-compose-app.yml up -d; \
	else \
		echo "Notice: Image 'settlement-api:local' not found. Skipping API containers gracefully."; \
	fi

down-app:
	@echo "Tearing down member node API containers..."
	@docker compose -f docker-compose-app.yml down -v || true

stop-jurb:
	@for c in peer0.regb cc.regb api.regb peer0.bankb1 cc.bankb1 api.bankb1; do \
		if docker ps -a --format '{{.Names}}' | grep -q "^$$c$$"; then \
			docker stop $$c; \
		fi \
	done

start-jurb:
	@for c in peer0.regb cc.regb api.regb peer0.bankb1 cc.bankb1 api.bankb1; do \
		if docker ps -a --format '{{.Names}}' | grep -q "^$$c$$"; then \
			docker start $$c; \
		fi \
	done

logs:
	docker compose logs -f peer0.$(ORG) cc.$(ORG) api.$(ORG)

trail:
	docker logs -f api.auditor

smoke:
	@"$(SHELL)" ./api/scripts/smoke.sh

reset-demo:
	@"$(SHELL)" ./api/scripts/smoke.sh --bootstrap-only

demo: smoke

test-cc:
	cd chaincode && go test -v ./...
