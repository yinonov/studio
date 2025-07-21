# Contract Access Control Refactor - Detailed Task Breakdown

## Overview

Transform from simple `ownerId` based contract access to a comprehensive access control system with groups, permissions, and sharing capabilities based on industry analysis report.

## Phase 1: Foundation & Schema (2-3 hours)

### Task 1.1: Update Access Control Schema (30 mins)

- [ ] **File**: `/shared/types/access-control.ts`
- [ ] **Action**: Review and refine the current schema
- [ ] **Details**:
  - Ensure all access levels are properly defined
  - Validate permission enum values
  - Add any missing helper types
- [ ] **Test**: Schema compiles without errors
- [ ] **Dependencies**: None

### Task 1.2: Create Database Collections Documentation (15 mins)

- [ ] **File**: `/docs/database-schema.md`
- [ ] **Action**: Document new Firestore collections structure
- [ ] **Details**:
  - `contract_access` collection structure
  - `user_groups` collection (if needed)
  - Index requirements
- [ ] **Test**: Documentation is clear and complete
- [ ] **Dependencies**: Task 1.1

### Task 1.3: Update Firestore Security Rules (45 mins)

- [ ] **File**: `/firestore.rules`
- [ ] **Action**: Add rules for new collections
- [ ] **Details**:
  - Rules for `contract_access` collection
  - Ensure users can only access their own access records
  - Prevent unauthorized access grants
- [ ] **Test**: Deploy rules to development and test access patterns
- [ ] **Dependencies**: Task 1.1, 1.2

## Phase 2: Backend Cloud Functions (3-4 hours)

### Task 2.1: Create Basic Access Grant Function (1 hour)

- [ ] **File**: `/functions/src/contract-access/grant-access.ts`
- [ ] **Action**: Create single function for granting access
- [ ] **Details**:
  - Accept contractId, userEmail, accessLevel, permissions
  - Validate user has permission to grant access
  - Create record in contract_access collection
  - Handle email-to-userId resolution
- [ ] **Test**: Function deploys and grants access correctly
- [ ] **Dependencies**: Task 1.1, 1.3

### Task 2.2: Create Access Revoke Function (45 mins)

- [ ] **File**: `/functions/src/contract-access/revoke-access.ts`
- [ ] **Action**: Create function to revoke access
- [ ] **Details**:
  - Accept contractId, userId
  - Validate requesting user has permission
  - Delete access record
- [ ] **Test**: Function revokes access correctly
- [ ] **Dependencies**: Task 2.1

### Task 2.3: Create Access List Function (30 mins)

- [ ] **File**: `/functions/src/contract-access/list-access.ts`
- [ ] **Action**: Get all access records for a contract
- [ ] **Details**:
  - Return list of users with access levels
  - Include user display information
- [ ] **Test**: Returns correct access list
- [ ] **Dependencies**: Task 2.1

### Task 2.4: Update Contract Preparation Function (45 mins)

- [ ] **File**: `/functions/src/signing.ts`
- [ ] **Action**: Modify `prepareContractForSigning` to create access records
- [ ] **Details**:
  - When creating signature request, grant signer access
  - Ensure owner access is recorded
- [ ] **Test**: Contract creation grants appropriate access
- [ ] **Dependencies**: Task 2.1

### Task 2.5: Create Functions Index File (15 mins)

- [ ] **File**: `/functions/src/contract-access/index.ts`
- [ ] **Action**: Export all access control functions
- [ ] **Details**: Clean exports for all functions
- [ ] **Test**: Functions can be imported
- [ ] **Dependencies**: Tasks 2.1-2.4

### Task 2.6: Update Main Functions Index (15 mins)

- [ ] **File**: `/functions/src/index.ts`
- [ ] **Action**: Export contract access functions
- [ ] **Details**: Add exports for new functions
- [ ] **Test**: Functions are available for deployment
- [ ] **Dependencies**: Task 2.5

## Phase 3: Enhanced Backend Services (2-3 hours)

### Task 3.1: Create Basic Contract Access Service (1 hour)

- [ ] **File**: `/src/firebase/contractAccessServices.ts`
- [ ] **Action**: Create service for fetching contracts with access
- [ ] **Details**:
  - Replace simple `ownerId` queries
  - Query `contract_access` collection first
  - Batch fetch contracts based on access
- [ ] **Test**: Service returns contracts user has access to
- [ ] **Dependencies**: Phase 2 complete

### Task 3.2: Add Real-time Subscription Support (45 mins)

- [ ] **File**: `/src/firebase/contractAccessServices.ts`
- [ ] **Action**: Add subscription methods
- [ ] **Details**:
  - Listen to contract_access changes
  - Update contract list in real-time
- [ ] **Test**: Subscriptions work correctly
- [ ] **Dependencies**: Task 3.1

### Task 3.3: Create Client-side Access Control Service (45 mins)

- [ ] **File**: `/src/firebase/contractAccessServices.client.ts`
- [ ] **Action**: Frontend wrapper for Cloud Functions
- [ ] **Details**:
  - Type-safe wrappers for grant/revoke/list functions
  - Error handling and result processing
- [ ] **Test**: Client functions work correctly
- [ ] **Dependencies**: Phase 2 complete

## Phase 4: Frontend Integration (2-3 hours)

### Task 4.1: Create Simple Contract Access Hook (1 hour)

- [ ] **File**: `/src/hooks/useContractAccess.ts`
- [ ] **Action**: Basic React hook for contract access
- [ ] **Details**:
  - Load contracts with access control
  - Share contract functionality
  - Get access list
- [ ] **Test**: Hook loads and shares contracts
- [ ] **Dependencies**: Task 3.3

### Task 4.2: Update Dashboard to Use New Hook (1 hour)

- [ ] **File**: `/src/app/dashboard/page.tsx`
- [ ] **Action**: Replace current contract loading with access control
- [ ] **Details**:
  - Use `useContractAccess` instead of direct queries
  - Maintain existing UI functionality
- [ ] **Test**: Dashboard loads contracts correctly
- [ ] **Dependencies**: Task 4.1

### Task 4.3: Add Basic Sharing UI (1 hour)

- [ ] **File**: `/src/components/contracts/ShareContractDialog.tsx`
- [ ] **Action**: Create simple sharing interface
- [ ] **Details**:
  - Email input for sharing
  - Access level selection
  - Basic permission checkboxes
- [ ] **Test**: Users can share contracts
- [ ] **Dependencies**: Task 4.1

## Phase 5: Migration & Testing (1-2 hours)

### Task 5.1: Create Migration Script (45 mins)

- [ ] **File**: `/scripts/migrate-contract-access.ts`
- [ ] **Action**: Migrate existing contracts to new system
- [ ] **Details**:
  - Create owner access records for existing contracts
  - Handle shared contracts if any exist
- [ ] **Test**: Migration completes without errors
- [ ] **Dependencies**: Phase 2 complete

### Task 5.2: Update Existing Contract Queries (30 mins)

- [ ] **File**: Multiple files in `/src/app/contracts/`
- [ ] **Action**: Update any remaining ownerId queries
- [ ] **Details**: Replace with access control queries
- [ ] **Test**: All contract views work correctly
- [ ] **Dependencies**: Task 4.2

### Task 5.3: Add Basic Tests (45 mins)

- [ ] **File**: `/tests/unit/contract-access.test.ts`
- [ ] **Action**: Basic unit tests for access control
- [ ] **Details**:
  - Test access granting/revoking
  - Test contract fetching with access
- [ ] **Test**: All tests pass
- [ ] **Dependencies**: Phase 4 complete

## Phase 6: Advanced Features (Optional - 2-3 hours)

### Task 6.1: Add Webhook Integration (1 hour)

- [ ] **File**: `/functions/src/dropbox-sign-webhook.ts`
- [ ] **Action**: Update contract access when signatures complete
- [ ] **Details**: Sync Dropbox Sign events with access records
- [ ] **Test**: Webhooks update access correctly
- [ ] **Dependencies**: Phase 2 complete

### Task 6.2: Add Group Support (1.5 hours)

- [ ] **File**: `/src/firebase/groupServices.ts`
- [ ] **Action**: Support for user groups in access control
- [ ] **Details**: Group-based access management
- [ ] **Test**: Groups work for contract access
- [ ] **Dependencies**: Phase 4 complete

### Task 6.3: Add Audit Logging (45 mins)

- [ ] **File**: `/functions/src/audit-logging.ts`
- [ ] **Action**: Log all access control changes
- [ ] **Details**: Track who granted/revoked access when
- [ ] **Test**: Audit logs are created
- [ ] **Dependencies**: Phase 2 complete

## Estimated Total Time: 10-15 hours

## Priority Order

1. **Phase 1** (Foundation) - Must complete first
2. **Phase 2** (Backend) - Core functionality
3. **Phase 3** (Services) - Required for frontend
4. **Phase 4** (Frontend) - User-facing features
5. **Phase 5** (Migration) - Make it work with existing data
6. **Phase 6** (Advanced) - Nice-to-have features

## Success Criteria

- [ ] Users can share contracts with others via email
- [ ] Shared users can access contracts based on their permissions
- [ ] Dashboard shows all contracts user has access to (owned + shared)
- [ ] No breaking changes to existing functionality
- [ ] All existing contracts continue to work

## Rollback Plan

- Keep original contract queries as fallback
- Feature flags for new vs old access control
- Migration can be run in reverse if needed
