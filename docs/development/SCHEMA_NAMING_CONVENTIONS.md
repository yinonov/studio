# Schema Naming Conventions

## ✅ Consistent Naming Pattern

### **Zod Schema → TypeScript Type Convention**:
- `SomethingSchema` (runtime validation) → `Something` (compile-time type)
- Schema name always ends with `Schema`
- Type name is the same without `Schema` suffix

### **Examples in our codebase**:
```typescript
// ✅ Correct pattern
export const ContractSchema = z.object({...});
export type Contract = z.infer<typeof ContractSchema>;

export const AccessLevelSchema = z.enum([...]);
export type AccessLevel = z.infer<typeof AccessLevelSchema>;

export const PermissionSchema = z.enum([...]);
export type Permission = z.infer<typeof PermissionSchema>;
```

### **What we fixed**:
```typescript
// ❌ Before: Inconsistent legacy naming
export type StoredContractDataSchema = Contract;

// ✅ After: Clean, consistent naming
export const ContractSchema = z.object({...});
export type Contract = z.infer<typeof ContractSchema>;
```

## 📋 Current Schema/Type Pairs

| Zod Schema | TypeScript Type | Purpose |
|------------|-----------------|---------|
| `CustomClauseSchema` | `CustomClause` | Contract clause structure |
| `AccessLevelSchema` | `AccessLevel` | Access hierarchy enum |
| `PermissionSchema` | `Permission` | Granular permissions enum |
| `GroupSchema` | `Group` | User groups for bulk access |
| `UserSchema` | `User` | Extended user profiles |
| `ContractAccessSchema` | `ContractAccess` | Junction table for access control |
| `ContractSchema` | `Contract` | Core contract document |
| `AuditLogSchema` | `AuditLog` | Security audit trail |
| `ContractListQuerySchema` | `ContractListQuery` | Query parameters |
| `RequestDataSchema` | `RequestData` | Cloud Function requests |

## 🎯 Benefits

1. **Predictable**: If you see `XSchema`, you know `X` type exists
2. **Searchable**: Easy to find related schema/type pairs
3. **Maintainable**: Clear relationship between runtime and compile-time
4. **Standard**: Follows Zod community conventions

## 🔧 Usage Pattern

```typescript
// Import both schema and type
import { ContractSchema, type Contract } from '@shared/types/access-control';

// Use schema for validation
const validatedContract = ContractSchema.parse(rawData);

// Use type for annotations
const processContract = (contract: Contract) => {
  // TypeScript knows the shape
};
```

This convention makes our codebase much cleaner and more maintainable!
