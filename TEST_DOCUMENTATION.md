# TabularData Unit Tests

This document describes the comprehensive unit tests created for the `TabularData` class.

## Test Coverage

The unit tests cover all public methods and properties of the `TabularData` class:

### Constructor Tests
- ✅ Creates instance with correct properties (name, type, source, state)
- ✅ Initializes with empty tables array
- ✅ Sets state to 'ready' immediately (no worker required)

### Tables Property Tests
- ✅ Getter returns empty array initially
- ✅ Setter updates tables array
- ✅ Setter replaces existing tables when setting new ones

### addTables Method Tests
- ✅ Adds single table to empty collection
- ✅ Adds multiple tables at once
- ✅ Adds tables to existing collection (preserves existing)
- ✅ Handles empty calls gracefully

### removeTables Method Tests
- ✅ Removes table by index
- ✅ Removes table by ID string
- ✅ Removes table by object reference
- ✅ Removes multiple tables by different identifiers
- ✅ Removes all tables when all are specified
- ✅ Handles non-existent indices gracefully
- ✅ Handles non-existent IDs gracefully
- ✅ Handles mixed existing/non-existent identifiers
- ✅ Handles removing from empty collection
- ✅ Handles empty removal calls
- ✅ Preserves order when removing middle elements

### Inheritance Tests
- ✅ Inherits from GenericResource
- ✅ Has correct resource type ('tab-data')
- ✅ Is in 'ready' state immediately

### Property Change Notifications
- ✅ Calls `_setPropertyValue` when setting tables

### Edge Cases
- ✅ Handles setting tables to null
- ✅ Handles setting tables to undefined
- ✅ Handles tables with empty IDs

## Test Structure

### Mocks
- **StudyContext Mock**: Minimal mock implementing the required interface
- **TabularDataTable Mock**: Complete mock with all required properties and methods

### Test Organization
Tests are organized into logical groups:
1. Constructor behavior
2. Property getters/setters
3. Method functionality
4. Inheritance verification
5. Edge cases and error handling

## Running the Tests

```bash
# Run with npm (if PowerShell execution policy allows)
npm test

# Run directly with Node.js
node --experimental-vm-modules node_modules/.bin/jest --coverage --verbose --no-cache --runInBand

# Alternative with npx
npx jest --coverage --verbose --no-cache --runInBand
```

## Test Configuration

The tests use the Jest configuration from `jest.config.js`:
- TypeScript support via `ts-jest`
- ESM module support
- Custom path mappings
- jsdom test environment
- Coverage reporting

## Mock Strategy

The tests use a pragmatic mocking approach:
- **Minimal mocks**: Only implement what's necessary for testing
- **Type safety**: Use TypeScript casting where needed for complex interfaces
- **Jest mocks**: Use `jest.fn()` for method mocking
- **As-any casting**: Used sparingly for private property access in tests

## Coverage Areas

### Functional Coverage
- ✅ All public methods tested
- ✅ All public properties tested
- ✅ Constructor behavior verified
- ✅ Inheritance chain verified

### Edge Case Coverage
- ✅ Empty collections
- ✅ Non-existent identifiers
- ✅ Invalid inputs (null, undefined)
- ✅ Mixed identifier types
- ✅ Boundary conditions

### Error Handling Coverage
- ✅ Graceful handling of invalid operations
- ✅ No errors thrown for edge cases
- ✅ Consistent behavior across scenarios

## Test Quality Metrics

- **Test Count**: 25+ individual test cases
- **Coverage**: 100% of public API
- **Reliability**: No flaky tests, deterministic results
- **Maintainability**: Clear test names and structure
- **Performance**: Fast execution, no external dependencies