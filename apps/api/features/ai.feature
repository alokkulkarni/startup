Feature: AI Chat
  As a user
  I want to chat with Forge AI to build my app
  So that I can generate and modify code using natural language

  Background:
    Given I am authenticated as a user
    And I have a project called "My React App"

  Scenario: User sends a valid prompt and receives a streaming response
    When I POST to "/api/v1/projects/{id}/ai/chat" with prompt "Add a blue header saying Hello World"
    Then the response is an SSE stream
    And the stream contains text chunks
    And the stream ends with a "done" event
    And the user message is saved to the database
    And the assistant message is saved to the database

  Scenario: User exceeds the daily AI rate limit
    Given I have sent 50 AI messages today
    When I POST to "/api/v1/projects/{id}/ai/chat" with prompt "Add something"
    Then the response status is 429
    And the response header "X-RateLimit-Remaining" is "0"
    And the response body contains "Daily AI message limit reached"

  Scenario: AI response with file changes updates project files
    Given the AI response contains a diff for "src/app/page.tsx"
    When I POST to "/api/v1/projects/{id}/ai/chat" with prompt "Add a header"
    Then the project file "src/app/page.tsx" is updated in the database
    And the assistant message is saved with the full content

  Scenario: User fetches conversation history
    Given I have an existing conversation with 3 messages
    When I GET "/api/v1/projects/{id}/ai/history"
    Then the response status is 200
    And the response contains a "messages" array with 3 items
    And the response contains a "conversationId" field
