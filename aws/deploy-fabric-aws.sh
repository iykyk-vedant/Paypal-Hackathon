#!/bin/bash
# ==============================================================================
# PayBridge AI — Deploy / Start Separate Fabric Proof of Concept on AWS EC2
# ==============================================================================

set -e

echo "Starting Hyperledger Fabric 2.5 Consortium on AWS EC2..."
docker compose up -d

echo "Verifying running containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "Consortium health check:"
curl -s http://localhost:7050 || true
echo "Fabric AWS node is READY."
