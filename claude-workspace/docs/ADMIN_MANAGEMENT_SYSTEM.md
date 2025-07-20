# Admin Management System Documentation

## Overview

The Park Golf Platform implements a sophisticated admin management system with role-based access control (RBAC), hierarchical permissions, and scope-based data filtering. This document provides comprehensive details about the system architecture, implementation, and usage.

## System Architecture

### Frontend Architecture

```
AdminAuthContext (Authentication State)
    ├── Login/Logout Management
    ├── Permission Checking
    ├── Scope-based Access Control
    └── Session Persistence

Components
    ├── PermissionGuard (Route Protection)
    ├── EnhancedAdminList (Admin Management UI)
    ├── AdminForm (Create/Edit Forms)
    └── RoleManagement (Permission Assignment)
```

### Backend Architecture

```
auth-service
    ├── Admin Authentication (JWT)
    ├── Admin CRUD Operations
    ├── Permission Management
    └── Activity Logging

admin-api (BFF)
    ├── Admin Endpoints
    ├── Permission Middleware
    └── NATS Communication
```

## Role System

### Role Hierarchy

The system implements a hierarchical role structure with numeric hierarchy values:

| Role | Hierarchy | Scope | Description |
|------|-----------|-------|-------------|
| PLATFORM_OWNER | 100 | PLATFORM | Full system control |
| PLATFORM_ADMIN | 90 | PLATFORM | Platform operations |
| PLATFORM_SUPPORT | 80 | PLATFORM | Customer support |
| PLATFORM_ANALYST | 75 | PLATFORM | Analytics access |
| COMPANY_OWNER | 70 | COMPANY | Company control |
| COMPANY_MANAGER | 60 | COMPANY | Company operations |
| COURSE_MANAGER | 50 | COURSE | Course management |
| STAFF | 40 | COURSE | Basic operations |
| READONLY_STAFF | 30 | COURSE | View only access |

### Permission Categories

#### Platform Permissions
- `PLATFORM_ALL` - Complete platform access
- `PLATFORM_COMPANY_MANAGE` - Company management
- `PLATFORM_USER_MANAGE` - User management
- `PLATFORM_SYSTEM_CONFIG` - System configuration
- `PLATFORM_ANALYTICS` - Platform analytics
- `PLATFORM_SUPPORT` - Support tools

#### Company Permissions
- `COMPANY_ALL` - Complete company access
- `COMPANY_ADMIN_MANAGE` - Admin management
- `COMPANY_COURSE_MANAGE` - Course management
- `COMPANY_BOOKING_MANAGE` - Booking management
- `COMPANY_USER_MANAGE` - Customer management
- `COMPANY_ANALYTICS` - Company analytics

#### Course Permissions
- `COURSE_TIMESLOT_MANAGE` - Time slot management
- `COURSE_BOOKING_MANAGE` - Booking operations
- `COURSE_CUSTOMER_VIEW` - Customer viewing
- `COURSE_ANALYTICS_VIEW` - Analytics viewing

#### UI Navigation Permissions
- `VIEW_DASHBOARD` - Dashboard access
- `MANAGE_COMPANIES` - Company management UI
- `MANAGE_COURSES` - Course management UI
- `MANAGE_TIMESLOTS` - Time slot UI
- `MANAGE_BOOKINGS` - Booking UI
- `MANAGE_USERS` - User management UI
- `MANAGE_ADMINS` - Admin management UI
- `VIEW_ANALYTICS` - Analytics UI
- `MANAGE_SYSTEM` - System settings UI

## Implementation Details

### AdminAuthContext

Located at: `/services/admin-dashboard/src/contexts/AdminAuthContext.tsx`

Key methods:
```typescript
interface AdminAuthContextType {
  // Authentication
  currentAdmin: Admin | null;
  isAuthenticated: boolean;
  login: (adminId: number) => Promise<void>;
  logout: () => void;
  
  // Permission Checking
  hasPermission: (permission: Permission) => boolean;
  canManageAdminRole: (targetRole: AdminRole) => boolean;
  
  // Scope-based Access
  canAccessCompany: (companyId: number) => boolean;
  canAccessCourse: (courseId: number) => boolean;
  getAccessibleCompanies: () => number[];
  getAccessibleCourses: () => number[];
  
  // Admin Management
  canManageAdmin: (targetAdminId: number) => boolean;
  canAddAdminToCompany: (companyId: number) => boolean;
}
```

### Permission Utils

Located at: `/services/admin-dashboard/src/utils/adminPermissions.ts`

Key exports:
- `ROLE_PERMISSION_MATRIX` - Role to permissions mapping
- `ADMIN_HIERARCHY` - Role hierarchy values
- `hasPermission()` - Permission checking function
- `canManageAdmin()` - Admin management validation
- `isPlatformAdmin()` - Platform role check
- `isCompanyAdmin()` - Company role check

### Usage Examples

#### Protected Route
```typescript
<Route
  path="/admin/management"
  element={
    <ProtectedRoute requiredPermission="MANAGE_ADMINS">
      <AdminManagementPage />
    </ProtectedRoute>
  }
/>
```

#### Conditional Rendering
```typescript
function AdminActions({ admin }) {
  const { canManageAdminRole, hasPermission } = useAdminAuth();
  
  return (
    <>
      {canManageAdminRole(admin.role) && (
        <Button onClick={() => handleEdit(admin)}>Edit</Button>
      )}
      {hasPermission('COMPANY_ADMIN_MANAGE') && (
        <Button onClick={() => handlePermissions(admin)}>
          Manage Permissions
        </Button>
      )}
    </>
  );
}
```

#### Scope-based Filtering
```typescript
function CompanySelector() {
  const { currentAdmin, getAccessibleCompanies } = useAdminAuth();
  const [companies, setCompanies] = useState([]);
  
  useEffect(() => {
    const accessibleIds = getAccessibleCompanies();
    if (accessibleIds.length === 0 && isPlatformAdmin(currentAdmin.role)) {
      // Platform admin - show all companies
      fetchAllCompanies().then(setCompanies);
    } else {
      // Company admin - show only accessible companies
      fetchCompaniesByIds(accessibleIds).then(setCompanies);
    }
  }, [currentAdmin]);
  
  return <Select options={companies} />;
}
```

## Database Schema

### Admin Table
```prisma
model Admin {
  id          Int       @id @default(autoincrement())
  username    String    @unique
  email       String    @unique
  password    String
  name        String
  role        AdminRole
  scope       AdminScope
  permissions Permission[]
  isActive    Boolean   @default(true)
  companyId   Int?
  courseIds   Int[]
  lastLoginAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  company     Company?  @relation(fields: [companyId], references: [id])
}

enum AdminRole {
  PLATFORM_OWNER
  PLATFORM_ADMIN
  PLATFORM_SUPPORT
  PLATFORM_ANALYST
  COMPANY_OWNER
  COMPANY_MANAGER
  COURSE_MANAGER
  STAFF
  READONLY_STAFF
}

enum AdminScope {
  PLATFORM
  COMPANY
  COURSE
}
```

## Security Considerations

### Frontend Security
1. **UI-Only Validation**: Frontend permission checks are for UX only
2. **No Sensitive Data**: Never store sensitive permissions in frontend
3. **Token Management**: JWT tokens with expiration and refresh
4. **Session Storage**: Currently using localStorage (consider alternatives)

### Backend Security
1. **JWT Validation**: Every request validates JWT token
2. **Permission Verification**: Service layer permission checks
3. **Scope Validation**: Data access validated against admin scope
4. **Activity Logging**: All admin actions are logged
5. **Password Security**: Bcrypt hashing with salt rounds

### Best Practices
1. Always validate permissions on both frontend and backend
2. Use TypeScript types for type safety
3. Implement audit logging for sensitive operations
4. Regular security audits
5. Principle of least privilege

## Testing

### Unit Tests
```typescript
describe('Permission System', () => {
  test('Platform admin has all permissions', () => {
    const permissions = getDefaultPermissions('PLATFORM_OWNER');
    expect(hasPermission(permissions, 'PLATFORM_ALL')).toBe(true);
  });
  
  test('Company admin limited to company scope', () => {
    const admin = { role: 'COMPANY_OWNER', companyId: 1 };
    expect(canAccessCompany(1)).toBe(true);
    expect(canAccessCompany(2)).toBe(false);
  });
});
```

### Integration Tests
- Authentication flow testing
- Permission inheritance validation
- Scope-based access testing
- Role management workflows

## API Endpoints

### Admin Management
- `GET /api/v1/admins` - List admins (filtered by scope)
- `GET /api/v1/admins/:id` - Get admin details
- `POST /api/v1/admins` - Create admin
- `PUT /api/v1/admins/:id` - Update admin
- `DELETE /api/v1/admins/:id` - Delete admin
- `POST /api/v1/admins/:id/permissions` - Update permissions

### Authentication
- `POST /api/v1/admin/login` - Admin login
- `POST /api/v1/admin/logout` - Admin logout
- `POST /api/v1/admin/refresh` - Refresh token
- `GET /api/v1/admin/me` - Current admin info

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Verify admin role has required permission
   - Check scope matches resource
   - Ensure JWT token is valid

2. **Cannot Manage Admin**
   - Check role hierarchy
   - Verify same company/scope
   - Ensure management permissions

3. **Data Not Visible**
   - Check scope-based filtering
   - Verify company/course assignment
   - Review permission matrix

### Debug Mode
Enable debug logging:
```typescript
// In AdminAuthContext
const DEBUG = true;
if (DEBUG) {
  console.log('Permission check:', { permission, result });
}
```

## Future Enhancements

### Planned Features
1. Two-factor authentication
2. Permission delegation
3. Temporary permissions
4. Role templates
5. Audit log UI
6. Permission versioning
7. Bulk admin management
8. API key management

### Migration Path
1. Current: Context-based state management
2. Future: Consider state management library if complexity grows
3. Enhanced session management (secure cookies)
4. OAuth/SSO integration

---

Last Updated: 2025-01-11