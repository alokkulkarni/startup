Feature: Health Check
  As a platform operator
  I want to monitor service health
  So that I can detect outages quickly

  Scenario: All services healthy
    Given all infrastructure services are running
    When I call GET /api/v1/health
    Then the response status is 200
    And the response body has status "ok"
    And the response body includes service statuses for database, redis, and storage

  Scenario: Health endpoint is publicly accessible
    Given no authentication token
    When I call GET /api/v1/health
    Then the response status is 200
