# Role-Based Route Guards

This directory contains route guards that control access to different parts of the application based on user roles.

## Guards

### `adminGuard`
- **Purpose**: Protects admin routes
- **Access**: Users with `role_id = 4` (Admin) or `role_id = 5` (SuperAdmin)
- **Behavior**: 
  - If user is not logged in → redirects to `/login-admin`
  - If user has admin or superadmin role → allows access
  - If user doesn't have admin privileges → redirects to `/home`

### `facultyGuard`
- **Purpose**: Protects faculty routes
- **Access**: Users with `role_id = 3` (Faculty) only
- **Behavior**:
  - If user is not logged in → redirects to `/login-faculty`
  - If user has faculty role → allows access
  - If user has superadmin role (role_id = 5) → redirects to `/admin-dashboard`
  - If user has admin role (role_id = 4) → redirects to `/admin-dashboard`
  - If user doesn't have faculty privileges → redirects to `/home`

## Role System

Based on the server-side implementation:
- `role_id = 2`: Student
- `role_id = 3`: Faculty
- `role_id = 4`: Admin
- `role_id = 5`: SuperAdmin

## Usage

Routes are protected by adding the appropriate guard to the `canActivate` array:

```typescript
// Faculty routes (accessible by role_id = 3 only)
{path: 'faculty-home', component: FacultyHome, canActivate: [facultyGuard]}

// Admin routes (accessible by role_id = 4 or 5)
{path: 'admin-dashboard', component: AdminDashboard, canActivate: [adminGuard]}
```

## Testing

Visit `/role-test` to see current user information and test role-based access to different routes.
