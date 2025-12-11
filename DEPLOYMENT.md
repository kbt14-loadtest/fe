# 🚀 배포 가이드

EC2 인스턴스에 Next.js 애플리케이션을 배포하는 방법을 설명합니다.

## 📋 사전 준비

### 1. PEM 키 파일 준비
```bash
# PEM 키를 ssh 디렉토리에 복사
cp ~/Downloads/ktb-14.pem ./ssh/

# 권한 설정 (Makefile에서 자동으로 설정되지만 수동으로도 가능)
chmod 400 ./ssh/ktb-14.pem
```

### 2. EC2 서버 설정 확인
- SSH 포트 22 열려있는지 확인
- 보안 그룹에서 IP 허용 확인
- EC2 인스턴스에 Node.js 설치 확인

## 🎯 배포 명령어

### 도움말 보기
```bash
make help
```

### 기본 배포 (프로덕션 서버)
```bash
# 기본 설정으로 배포 (PROD_SERVER=3.36.48.31)
make deploy

# 또는
make deploy-prod
```

### 개발 서버 배포
```bash
make deploy-dev DEV_SERVER=1.2.3.4
```

### 모든 서버에 배포
```bash
make deploy-all PROD_SERVER=3.36.48.31 DEV_SERVER=1.2.3.4
```

## 🔧 환경 변수 커스터마이징

### 여러 옵션 동시 사용
```bash
make deploy \
  PEM_KEY=./ssh/my-key.pem \
  PROD_SERVER=1.2.3.4 \
  SSH_USER=ec2-user \
  DEPLOY_PATH=/var/www/app
```

## 📝 예시

### 1. 처음 배포하는 경우
```bash
# 1. PEM 키 복사
cp ~/Downloads/ktb-14.pem ./ssh/

# 2. 배포
make deploy
```

### 2. 여러 환경에 배포
```bash
make deploy-all PROD_SERVER=3.36.48.31 DEV_SERVER=1.2.3.4
```

## ⚠️ 보안 주의사항

1. **PEM 키 관리**
   - PEM 키는 절대 Git에 커밋하지 마세요
   - 권한은 `400`으로 설정하세요

2. **환경 변수**
   - `.env` 파일도 Git에 커밋하지 마세요
