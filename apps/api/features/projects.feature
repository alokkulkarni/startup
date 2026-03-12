Feature: Project Management
  As a logged-in user
  I want to create and manage projects
  So that I can organise my AI-generated apps

  Scenario: Create a new React project
    Given an authenticated user with a workspace
    When I call POST /api/v1/projects with name "Todo App" and framework "react"
    Then the response status is 201
    And the response includes a project with starter files

  Scenario: List projects returns only non-deleted projects
    Given an authenticated user with two projects, one deleted
    When I call GET /api/v1/projects
    Then the response status is 200
    And only the active project is returned

  Scenario: Soft-delete does not permanently remove data
    Given an authenticated user with project "My App"
    When I call DELETE /api/v1/projects/:id
    Then the response status is 200
    And the project status is set to "deleted"
    And the project is not returned in GET /api/v1/projects

  Scenario: Duplicate clones all files
    Given an authenticated user with project "My App" containing 3 files
    When I call POST /api/v1/projects/:id/duplicate
    Then the response status is 201
    And the new project has name "My App (copy)"
    And the new project contains 3 files
