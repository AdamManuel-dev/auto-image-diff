# TODO: Type Improvements

## Priority 1: Test File Type Safety

### 1. Create Test Utilities
**Files Affected**: All test files  
**Current Pattern**:
```typescript
const scanDir = (processor as any).scanDirectory.bind(processor);
```
**Proposed Solution**:
```typescript
// Create test-utils/types.ts
export function getPrivateMethod<T, K extends keyof T>(
  instance: T,
  methodName: K
): T[K] {
  return instance[methodName];
}
```

### 2. Mock Type Definitions
**Files**: `__tests__/*.test.ts`  
**Current**:
```typescript
mockFs.readdir.mockImplementation(async (dir: any) => { ... });
```
**Proposed**: Create proper mock types for fs operations

## Priority 2: CLI Type Safety

### 1. Method Option Type
**File**: `src/cli.ts:391`  
**Current**:
```typescript
method: (options.method as any) || "subimage"
```
**Proposed**:
```typescript
type AlignmentMethod = "feature" | "phase" | "subimage" | "opencv";
method: (options.method as AlignmentMethod) || "subimage"
```

## Priority 3: External Library Types

### 1. OpenCV.js Types
**File**: `src/types/opencv-js.d.ts`  
**Status**: Currently using `any` as a placeholder  
**Action**: Either:
- Find community @types/opencv.js package
- Expand current type definitions based on actual usage
- Keep minimal types since OpenCV is currently disabled

## Low Priority: Type Assertions in Tests

### Mock Object Assertions
Many `as any` usages in tests are for creating partial mock objects.
Consider using:
- `jest.mocked()` helper
- Partial<T> types
- Deep partial utility types

## Metrics to Track
- Current 'any' count: 70
- Current type assertions: 187
- Goal: Reduce by 50% without compromising test flexibility