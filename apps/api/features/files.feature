Feature: File Management API
  As a logged-in user
  I want to create, update, and delete project files via the API
  So that I can manage file contents programmatically

  Scenario: Create a new file via PUT
    Given an authenticated user with an active project
    When I call PUT /api/v1/projects/:id/files/src/index.ts with valid content
    Then the response status is 200
    And the response includes path, sizeBytes, and mimeType

  Scenario: Update existing file content
    Given an authenticated user with an active project containing file "src/App.tsx"
    When I call PUT /api/v1/projects/:id/files/src/App.tsx with new content
    Then the response status is 200
    And the file content is updated
    And the sizeBytes reflects the new content length

  Scenario: Delete a file
    Given an authenticated user with an active project containing file "src/App.tsx"
    When I call DELETE /api/v1/projects/:id/files/src/App.tsx
    Then the response status is 204
    And the file is removed from the project
