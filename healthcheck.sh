#!/bin/bash
# Healthcheck script para Dokploy
curl -f http://localhost:3001/health || exit 1