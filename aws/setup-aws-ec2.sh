#!/bin/bash
# ==============================================================================
# PayFabric AI — AWS EC2 1-Click Bootstrap Script
# Optimized for Ubuntu 22.04 LTS on AWS EC2 (t3.small / t3.medium)
# Cost-effective: Runs full 5-peer + 3-orderer Fabric 2.5 network on $0.50/day
# ==============================================================================

set -e

echo "========================================================================"
echo "  PayFabric AI — Initializing AWS EC2 Environment for Hyperledger Fabric"
echo "========================================================================"

# 1. Update OS & Install Basic Tools
sudo apt-get update -y
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common jq git make

# 2. Setup 4 GB Swap Space (Essential for running 5 peers smoothly on t3.small/medium)
if [ ! -f /swapfile ]; then
    echo "Creating 4 GB Swap space to prevent out-of-memory errors..."
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap created successfully: $(free -h)"
fi

# 3. Install Docker Engine & Docker Compose v2
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh || sudo apt-get install -y docker.io docker-compose-v2 docker-buildx-plugin
    sudo usermod -aG docker $USER
    rm -f get-docker.sh
    sudo chmod 666 /var/run/docker.sock || true
    echo "Docker installed successfully: $(docker --version)"
fi
sudo chmod 666 /var/run/docker.sock || true

# 4. Pull Required Hyperledger Fabric 2.5 Images
echo "Pulling official Hyperledger Fabric 2.5 Docker images..."
docker pull hyperledger/fabric-peer:2.5
docker pull hyperledger/fabric-orderer:2.5

# 5. Build Go CCAAS Chaincode
echo "Building Go CCAAS Chaincode Docker image (settlement-cc)..."
if [ -d "./chaincode" ]; then
    docker build -t settlement-cc:latest ./chaincode
fi

# 6. Launch Fabric Network Containers
echo "Launching 5-peer + 3-orderer Fabric network..."
docker compose up -d

# 7. Configure Auto-Restart on EC2 Reboot / Start-Stop
echo "Configuring automatic startup on EC2 boot/reboot..."
chmod +x network/start-fabric.sh network/stop-fabric.sh
CURRENT_DIR=$(pwd)
sudo bash -c "cat <<EOF > /etc/systemd/system/payfabric.service
[Unit]
Description=PayFabric Hyperledger Fabric 2.5 Auto-Restart Service
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${CURRENT_DIR}
ExecStart=/bin/bash ${CURRENT_DIR}/network/start-fabric.sh
ExecStop=/bin/bash ${CURRENT_DIR}/network/stop-fabric.sh
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl daemon-reload
sudo systemctl enable docker
sudo systemctl enable payfabric.service

echo "========================================================================"
echo "  SUCCESS! Hyperledger Fabric 2.5 is running and configured to AUTO-START."
echo "  Whenever you STOP and START this EC2 instance, all peers will automatically"
echo "  re-launch and restore ledger state with zero manual commands required."
echo "  Peer Ports Open for External gRPC:"
echo "    • peer0.rega:     7051"
echo "    • peer0.regb:     8051"
echo "    • peer0.banka1:   9051"
echo "    • peer0.bankb1:   10051"
echo "    • peer0.auditor:  11051"
echo "    • orderer:        7050"
echo "========================================================================"
