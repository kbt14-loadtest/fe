.PHONY: deploy build-local deploy-all deploy-prod deploy-dev help

# PEM 키 파일 경로
PEM_KEY ?= ./ssh/ktb-14.pem
SSH_USER ?= ubuntu

# 배포 대상 서버 설정
# 형식: SERVER_NAME=IP_ADDRESS
PROD_SERVER ?= 3.35.236.163 3.38.209.209 3.35.171.187
DEV_SERVER ?=
DEPLOY_SERVERS ?= $(PROD_SERVER)

# 배포 경로
DEPLOY_PATH ?= /home/ubuntu/ktb-chat-frontend

# SSH 및 RSYNC 옵션
SSH_OPTS := -i $(PEM_KEY) -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null
RSYNC_OPTS := -avz --delete -e "ssh $(SSH_OPTS)"

# 도움말
help:
	@echo "📖 사용 가능한 명령어:"
	@echo ""
	@echo "  make build-local          - 로컬에서 프로덕션 빌드"
	@echo "  make deploy              - 기본 서버에 배포 (PROD_SERVER)"
	@echo "  make deploy-all          - 모든 서버에 배포"
	@echo "  make deploy-prod         - 프로덕션 서버에만 배포"
	@echo "  make deploy-dev          - 개발 서버에만 배포"
	@echo ""
	@echo "🔧 환경 변수:"
	@echo "  PEM_KEY=./ssh/ktb-14.pem     - SSH PEM 키 파일 경로"
	@echo "  SSH_USER=ubuntu              - SSH 사용자명"
	@echo "  PROD_SERVER=3.36.48.31       - 프로덕션 서버 IP"
	@echo "  DEV_SERVER=                  - 개발 서버 IP"
	@echo "  DEPLOY_PATH=/home/ubuntu/... - 배포 경로"
	@echo ""
	@echo "📝 예시:"
	@echo "  make deploy PEM_KEY=./ssh/my-key.pem"
	@echo "  make deploy PROD_SERVER=1.2.3.4"
	@echo "  make deploy-all PROD_SERVER=1.2.3.4 DEV_SERVER=5.6.7.8"

# PEM 키 파일 권한 체크 및 설정
check-pem:
	@if [ ! -f "$(PEM_KEY)" ]; then \
		echo "❌ PEM 키 파일을 찾을 수 없습니다: $(PEM_KEY)"; \
		echo "💡 ssh 디렉토리에 PEM 키를 넣어주세요."; \
		exit 1; \
	fi
	@chmod 400 $(PEM_KEY) 2>/dev/null || true
	@echo "✅ PEM 키 확인 완료: $(PEM_KEY)"

# 로컬에서 프로덕션 빌드
build-local:
	@echo "🏗️  Building locally..."
	npm run build:production
	@echo "✅ Local build completed!"

# 단일 서버 배포 함수
define deploy_to_server
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "→ 배포 대상: $(1)"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "  📡 서버 연결 테스트..."
	@ssh $(SSH_OPTS) $(SSH_USER)@$(1) "echo '✅ 연결 성공'" || (echo "❌ 서버 연결 실패: $(1)" && exit 1)
	@echo "  📁 배포 디렉토리 생성..."
	@ssh $(SSH_OPTS) $(SSH_USER)@$(1) "mkdir -p $(DEPLOY_PATH)"
	@echo "  📦 Standalone 빌드 복사..."
	@rsync $(RSYNC_OPTS) --exclude='*.log' --exclude='.env*' --exclude="server.pid" --exclude='/package.json' .next/standalone/ $(SSH_USER)@$(1):$(DEPLOY_PATH)/
	@echo "  🎨 Static 파일 복사..."
	@rsync $(RSYNC_OPTS) .next/static $(SSH_USER)@$(1):$(DEPLOY_PATH)/.next/
	@echo "  🖼️  Public 파일 복사..."
	@rsync $(RSYNC_OPTS) public $(SSH_USER)@$(1):$(DEPLOY_PATH)/
	@echo "  🔧 재시작 스크립트 복사..."
	@rsync $(RSYNC_OPTS) restart.sh $(SSH_USER)@$(1):$(DEPLOY_PATH)/
	@echo "  🔄 서버 재시작..."
	@ssh $(SSH_OPTS) $(SSH_USER)@$(1) "cd $(DEPLOY_PATH) && chmod +x restart.sh && ./restart.sh"
	@echo "✅ $(1) 배포 완료!"
	@echo ""
endef

# 기본 배포 (여러 서버 지원)
deploy: check-pem build-local
	@echo "📦 배포 시작..."
	@if [ -z "$(PROD_SERVER)" ]; then \
		echo "❌ PROD_SERVER가 설정되지 않았습니다."; \
		exit 1; \
	fi
	$(foreach server,$(PROD_SERVER),$(call deploy_to_server,$(server)))
	@echo "🎉 배포 완료!"

# 프로덕션 서버 배포
deploy-prod: check-pem build-local
	@echo "📦 프로덕션 서버 배포 시작..."
	@if [ -z "$(PROD_SERVER)" ]; then \
		echo "❌ PROD_SERVER가 설정되지 않았습니다."; \
		exit 1; \
	fi
	$(foreach server,$(PROD_SERVER),$(call deploy_to_server,$(server)))
	@echo "🎉 프로덕션 배포 완료!"

# 개발 서버 배포
deploy-dev: check-pem build-local
	@echo "📦 개발 서버 배포 시작..."
	@if [ -z "$(DEV_SERVER)" ]; then \
		echo "❌ DEV_SERVER가 설정되지 않았습니다."; \
		echo "💡 사용법: make deploy-dev DEV_SERVER=1.2.3.4"; \
		exit 1; \
	fi
	$(call deploy_to_server,$(DEV_SERVER))
	@echo "🎉 개발 서버 배포 완료!"

# 모든 서버에 배포
deploy-all: check-pem build-local
	@echo "📦 모든 서버에 배포 시작..."
	@if [ -n "$(PROD_SERVER)" ]; then \
		$(call deploy_to_server,$(PROD_SERVER)); \
	fi
	@if [ -n "$(DEV_SERVER)" ]; then \
		$(call deploy_to_server,$(DEV_SERVER)); \
	fi
	@echo "🎉 모든 서버 배포 완료!"