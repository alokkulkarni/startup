#!/bin/sh
# Wait for MinIO to be ready then create buckets
sleep 5
mc alias set local http://minio:9000 minioadmin minioadmin
mc mb --ignore-existing local/avatars
mc mb --ignore-existing local/snapshots
mc mb --ignore-existing local/assets
mc anonymous set download local/assets
echo "MinIO buckets initialized"
