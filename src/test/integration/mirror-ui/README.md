# Mirror UI Integration Tests

This directory contains comprehensive integration tests for the Triage Mirror Stateless feature.

## Test Organization

### api-endpoints.test.ts
Tests all API endpoints with complete request/response cycles:
- GET /api/daily-plan/mirror
- POST /api/daily-plan/recalculate
- POST /api/daily-plan/state
- POST /api/daily-plan/triage
- PATCH /api/time-blocks/:id/complete
- PATCH /api/time-blocks/:id/edit
- DELETE /api/time-blocks/:id/delete
- POST /api/time-blocks/insert

### recalculation.test.ts
Tests recalculation functionality in detail:
- Preference preservation (wake_time, sleep_time)
- Plan replacement (not duplication)
- Graceful fallback when DailyContext unavailable
- Timeout handling (4 second limit)
- Completion state preservation
- Recalc-on-open preference
- Integration with existing Plan Builder

### database-operations.test.ts
Tests database persistence and queries:
- State declaration persistence
- Completion status persistence
- Time block updates and cascading
- Anchor deletion
- Step insertion
- User ownership verification
- Query performance
- Transaction handling
- Metadata JSONB operations

## Running Tests

```bash
# Run all integration tests
npm test src/test/integration/

# Run specific test file
npm test src/test/integration/mirror-ui/api-endpoints.test.ts

# Run with coverage
npm test -- --coverage src/test/integration/

# Run in watch mode
npm run test:watch src/test/integration/
```

## Test Patterns

### Mocking Strategy
- Mock Supabase client for database operations
- Mock fetch for API calls
- Mock serverAuth for authentication

### Assertions
- Verify request/response structure
- Verify database state changes
- Verify error handling
- Verify edge cases

### Coverage Goals
- 80% minimum code coverage
- All API endpoints tested
- All error paths tested
- All edge cases tested

## Requirements Coverage

These tests validate the following requirements:
- 1.1-1.5: Runway calculation
- 2.1-2.5: Triage mode activation
- 3.1-3.5: Triage decision options
- 4.1-4.5: Mirror UI route
- 5.1-5.4: Mirror UI content display
- 6.1-6.5: Stateless recalc preference
- 7.1-7.5: Manual recalc trigger
- 8.1-8.5: Recalc integration
- 16.1-16.10: State declaration
- 17.1-17.5: Completion tracking
- 18.1-18.5: Inline anchor editing
- 19.1-19.5: Inline chain step editing
- 20.1-20.5: Quick anchor add/delete
- 23.1-23.5: Mid-chain state persistence

## Security Testing

All tests verify:
- Authentication required for all endpoints
- User ID derived from session, not request body
- User ownership verification
- RLS policy enforcement (via application-level filtering)

## Performance Testing

Integration tests verify:
- API response times
- Database query efficiency
- No N+1 query patterns
- Timeout handling

## Next Steps

After integration tests pass:
1. Run e2e tests (src/test/e2e/)
2. Run performance tests (src/test/performance/)
3. Run accessibility tests
4. Conduct manual testing on all devices
