# Keycloak 24.0 — adds curl for Docker healthcheck
# Base image is ubi9-minimal which does not ship curl by default
FROM quay.io/keycloak/keycloak:24.0

USER root
RUN microdnf install -y curl && microdnf clean all

USER keycloak
