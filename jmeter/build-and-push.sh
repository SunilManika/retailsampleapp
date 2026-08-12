#!/bin/bash

# Build and push JMeter container image
# Usage: ./build-and-push.sh <registry-url>
# Example: ./build-and-push.sh quay.io/your-username

REGISTRY=${1:-"docker.io/sunilmanika"}
IMAGE_NAME="retail-jmeter"
TAG="latest"

echo "============================================"
echo "Building JMeter Container Image"
echo "Registry: $REGISTRY"
echo "Image: $IMAGE_NAME:$TAG"
echo "============================================"

# Build the image
echo "Building image..."
podman build -t ${IMAGE_NAME}:${TAG} .

if [ $? -ne 0 ]; then
    echo "Error: Build failed"
    exit 1
fi

# Tag for registry
echo "Tagging image for registry..."
podman tag ${IMAGE_NAME}:${TAG} ${REGISTRY}/${IMAGE_NAME}:${TAG}

# Push to registry
echo "Pushing image to registry..."
podman push ${REGISTRY}/${IMAGE_NAME}:${TAG}

if [ $? -ne 0 ]; then
    echo "Error: Push failed"
    echo "Make sure you're logged in: podman login ${REGISTRY}"
    exit 1
fi

echo "============================================"
echo "Success! Image pushed to:"
echo "${REGISTRY}/${IMAGE_NAME}:${TAG}"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Update k8s/jmeter-job.yaml with your registry URL"
echo "2. Deploy using the Operation Analysis tab in the app"

# Made with Bob
