Feature: Authentication & User Sync
  As a new user
  I want to authenticate via Keycloak
  So that my account is created and I can access the platform

  Scenario: First-time login creates user and workspace
    Given a valid Keycloak JWT for a new user
    When I call POST /api/v1/auth/sync
    Then the response status is 201
    And a user record is created in the database
    And a default workspace is created for the user

  Scenario: Repeat login is idempotent
    Given a valid Keycloak JWT for an existing user
    When I call POST /api/v1/auth/sync
    Then the response status is 200
    And no duplicate user is created

  Scenario: Request with no token is rejected
    Given no authentication token
    When I call POST /api/v1/auth/sync
    Then the response status is 401
    And the error code is "UNAUTHORIZED"

  Scenario: Expired token is rejected
    Given an expired Keycloak JWT
    When I call POST /api/v1/auth/sync
    Then the response status is 401
    And the error code is "TOKEN_EXPIRED"
