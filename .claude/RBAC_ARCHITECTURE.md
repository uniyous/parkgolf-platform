# Park Golf Platform - RBAC Architecture Documentation

## 📋 Overview

The Park Golf Platform implements a comprehensive Role-Based Access Control (RBAC) system with hierarchical permissions and scope-based filtering. This document describes the architecture, implementation details, and usage patterns.

## 🏗️ Architecture Components

### 1. Authentication & Authorization Flow

```
User Login → AdminAuthContext → JWT Token → Permission Check → Access Granted/Denied
```

### 2. Core Components

#### AdminAuthContext (`/services/admin-dashboard/src/contexts/AdminAuthContext.tsx`)
- Central authentication state management
- Permission checking methods
- Scope-based access control
- Company/Course filtering

#### Permission Utils (`/services/admin-dashboard/src/utils/adminPermissions.ts`)
- Role-permission matrix definitions
- Permission checking logic
- Role hierarchy management
- Helper functions

#### Backend Services
- **auth-service**: JWT token generation, admin authentication
- **admin-api**: BFF layer with permission-aware API endpoints

## 🎭 Role Hierarchy

### Platform Level Roles
```
PLATFORM_OWNER (100)
    ├── Full platform control
    ├── System configuration
    └── All permissions

PLATFORM_ADMIN (90)
    ├── Company management
    ├── User management
    └── Analytics access

PLATFORM_SUPPORT (80)
    ├── Customer support
    ├── Booking management
    └── Limited user access

PLATFORM_ANALYST (75)
    └── Read-only analytics access
```

### Company Level Roles
```
COMPANY_OWNER (70)
    ├── Full company control
    ├── Admin management (except owner)
    └── All company operations

COMPANY_MANAGER (60)
    ├── Course management
    ├── Staff management
    └── Daily operations

COURSE_MANAGER (50)
    ├── Time slot management
    ├── Booking management
    └── Customer service

STAFF (40)
    ├── Booking reception
    └── Customer support

READONLY_STAFF (30)
    └── View-only access
```

## 🔐 Permission System

### Permission Categories

#### Platform Permissions
- `PLATFORM_ALL`: Full platform access
- `PLATFORM_COMPANY_MANAGE`: Create/manage companies
- `PLATFORM_USER_MANAGE`: Manage all users
- `PLATFORM_SYSTEM_CONFIG`: System settings
- `PLATFORM_ANALYTICS`: Platform-wide analytics
- `PLATFORM_SUPPORT`: Customer support tools

#### Company Permissions
- `COMPANY_ALL`: Full company access
- `COMPANY_ADMIN_MANAGE`: Manage company admins
- `COMPANY_COURSE_MANAGE`: Manage courses
- `COMPANY_BOOKING_MANAGE`: Manage bookings
- `COMPANY_USER_MANAGE`: Manage customers
- `COMPANY_ANALYTICS`: Company analytics

#### Course Permissions
- `COURSE_TIMESLOT_MANAGE`: Time slot operations
- `COURSE_BOOKING_MANAGE`: Booking operations
- `COURSE_CUSTOMER_VIEW`: View customers
- `COURSE_ANALYTICS_VIEW`: View analytics

#### UI Navigation Permissions
- `VIEW_DASHBOARD`, `MANAGE_COMPANIES`, `MANAGE_COURSES`
- `MANAGE_TIMESLOTS`, `MANAGE_BOOKINGS`, `MANAGE_USERS`
- `MANAGE_ADMINS`, `VIEW_ANALYTICS`, etc.

## 🌐 Scope-Based Access Control

### Scope Types
1. **PLATFORM**: Access to entire platform
2. **COMPANY**: Access limited to specific company
3. **COURSE**: Access limited to specific courses

### Implementation
```typescript
// Check company access
canAccessCompany(companyId: number): boolean {
  if (isPlatformAdmin(currentAdmin.role)) {
    return true; // Platform admins can access all
  }
  return currentAdmin.companyId === companyId;
}

// Check course access
canAccessCourse(courseId: number): boolean {
  if (isPlatformAdmin(currentAdmin.role)) {
    return true;
  }
  if (currentAdmin.scope === 'COMPANY') {
    // Check if course belongs to admin's company
    return true; // Simplified, actual implementation checks ownership
  }
  if (currentAdmin.scope === 'COURSE' && currentAdmin.courseIds) {
    return currentAdmin.courseIds.includes(courseId);
  }
  return false;
}
```

## 🔄 Migration from Redux to Context API

### Key Changes
1. **State Management**: Moved from Redux slices to React Context
2. **Authentication State**: Centralized in AdminAuthContext
3. **Permission Checks**: Direct method calls instead of selectors
4. **Persistence**: localStorage for session management

### Migration Benefits
- Simpler state management
- Reduced boilerplate code
- Better TypeScript integration
- Easier testing
- Direct permission checking

## 📝 Implementation Examples

### 1. Protected Route with Permission Check
```typescript
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, requiredPermission }) {
  const { isAuthenticated, hasPermission } = useAdminAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" />;
  }
  
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/admin/unauthorized" />;
  }
  
  return children;
}
```

### 2. Conditional UI Rendering
```typescript
function AdminManagementPage() {
  const { hasPermission, canManageAdminRole } = useAdminAuth();
  
  return (
    <div>
      {hasPermission('MANAGE_ADMINS') && (
        <Button onClick={handleCreateAdmin}>
          Create Admin
        </Button>
      )}
      
      {admins.map(admin => (
        <AdminCard
          key={admin.id}
          admin={admin}
          canEdit={canManageAdminRole(admin.role)}
        />
      ))}
    </div>
  );
}
```

### 3. Scope-Based Data Filtering
```typescript
function CourseList() {
  const { currentAdmin, canAccessCourse } = useAdminAuth();
  const [courses, setCourses] = useState([]);
  
  useEffect(() => {
    fetchCourses().then(allCourses => {
      // Filter courses based on admin's access
      const accessibleCourses = allCourses.filter(course => 
        canAccessCourse(course.id)
      );
      setCourses(accessibleCourses);
    });
  }, [currentAdmin]);
  
  return <CourseGrid courses={courses} />;
}
```

## 🛡️ Security Considerations

### Frontend Security
1. **Permission checks are UI/UX only** - Never trust frontend validation
2. **All sensitive operations require backend validation**
3. **JWT tokens expire and require refresh**
4. **Session management via localStorage (consider secure alternatives)**

### Backend Security
1. **JWT validation on every request**
2. **Permission verification in service layer**
3. **Scope validation for data access**
4. **Activity logging for audit trails**

## 🧪 Testing Strategy

### Unit Tests
```typescript
describe('AdminAuthContext', () => {
  it('should check platform admin permissions correctly', () => {
    const admin = { role: 'PLATFORM_ADMIN', permissions: [...] };
    expect(hasPermission(admin.permissions, 'PLATFORM_COMPANY_MANAGE')).toBe(true);
  });
  
  it('should restrict company admin to own company', () => {
    const admin = { role: 'COMPANY_OWNER', companyId: 1 };
    expect(canAccessCompany(2)).toBe(false);
    expect(canAccessCompany(1)).toBe(true);
  });
});
```

### Integration Tests
- Test complete authentication flow
- Verify permission inheritance
- Test scope-based filtering
- Validate role hierarchy

## 📚 Best Practices

1. **Always check permissions in both frontend and backend**
2. **Use TypeScript types for all role/permission definitions**
3. **Implement audit logging for sensitive operations**
4. **Regular security audits of permission assignments**
5. **Clear documentation of role capabilities**

## 🔧 Maintenance Notes

### Adding New Permissions
1. Update `Permission` type in types/index.ts
2. Add to `ROLE_PERMISSION_MATRIX` in adminPermissions.ts
3. Update backend permission checks
4. Add UI elements with permission guards

### Adding New Roles
1. Update `AdminRole` type
2. Define permissions in matrix
3. Set hierarchy level
4. Update role assignment UI
5. Test role interactions

## 📊 Current Implementation Status

### ✅ Completed
- Role hierarchy implementation
- Permission matrix definition
- AdminAuthContext with all methods
- Scope-based access control
- UI permission guards
- Backend JWT authentication

### 🚧 In Progress
- Admin activity logging
- Permission audit reports
- Role assignment workflow
- Advanced permission delegation

### 📋 TODO
- Two-factor authentication
- Session timeout management
- Permission versioning
- Role templates
- Bulk permission management

---

Last Updated: 2025-01-11