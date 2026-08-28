# Quick Reference: UI Implementation Guide

## 📍 Global Modal Component
**Location**: `client/src/app/components/global-modal/`

### How to Use
```typescript
// Inject the ModalService
constructor(private modalService: ModalService) {}

// Show modal with configuration
this.modalService.openModal({
  title: 'Account Required',
  message: 'You must log in to access this feature.',
  icon: 'lock',
  primaryButtonText: 'Login',
  secondaryButtonText: 'Cancel'
});
```

### Responsive Behavior
- **Desktop**: Centered popup with scale-up animation
- **Mobile**: Bottom sheet sliding up from bottom edge
- **Breakpoint**: Changes at 768px (configurable via `isMobile()`)

### Styling
- Icon circle: 80px, background #ffebee
- Primary button: #800000 (dark red)
- Secondary button: white with #d0d0d0 border

---

## 📍 Navbar Component
**Location**: `client/src/app/components/navbar/`

### Structure
```
Navbar (80px fixed header)
├── Left: Logo (clickable → /home) + Hamburger (mobile)
├── Center: Nav Links (Home, Search, Submit, About) - Desktop only
└── Right: User Profile or Login Button
```

### Logo Routing
- Logo automatically routes to `/home` via `routerLink="/home"`
- No additional code needed in component

### Responsive Behavior
- **Desktop (>1200px)**: Centered nav visible
- **Tablet (768-1200px)**: Hamburger menu active
- **Mobile (<768px)**: Full mobile nav drawer

---

## 📍 Logout Routing
**Location**: `client/src/app/components/navbar/navbar.ts`

### Updated Method
```typescript
private async performLogout() {
  await this.auth.logout();
  sessionStorage.removeItem('guestMode');
  localStorage.removeItem('guestMode');
  
  // Routes to /login (STRICTLY /login, not /login-admin)
  this.router.navigate(['/login']);
}
```

### All Users
- Students → /login
- Guests → /login
- Faculty → /login
- Admin → /login

---

## 🎨 CSS Customization

### Modal Colors
```css
/* Icon background */
.icon-circle { background-color: #ffebee; }

/* Icon color */
.icon-container { color: #800000; }

/* Primary button */
.btn-primary { background-color: #800000; }

/* Secondary button border */
.btn-secondary { border: 1.5px solid #d0d0d0; }
```

### Navbar Colors
```css
/* Navbar background */
:host { background-color: #800000; }

/* Hover state */
:host ::ng-deep .nav-left .p-button:hover { background-color: #a00000; }
```

---

## 📱 Responsive Breakpoints

### Navbar Breakpoints
- **>1200px**: Desktop layout (logo + centered nav + profile)
- **768-1200px**: Tablet layout (hamburger + profile icon)
- **<768px**: Mobile layout (full hamburger menu)

### Modal Breakpoints
- **>768px**: Centered popup (scale-up animation)
- **≤768px**: Bottom sheet (slide-up animation)

---

## 🔧 Common Customizations

### Change Modal Icon
```typescript
// In component showing modal
this.modalService.openModal({
  icon: 'warning', // 'lock', 'info', 'warning', 'success', 'error'
  // ... other config
});
```

### Change Modal Colors
Edit `global-modal.css`:
- `.icon-circle { background-color: YOUR_COLOR; }`
- `.btn-primary { background-color: YOUR_COLOR; }`

### Adjust Navbar Center Gap
Edit `navbar.css`:
- `.nav-center { gap: 1.5rem; }` ← Change this value

### Change Responsive Breakpoint
Edit respective component CSS:
- Desktop/Mobile boundary: `@media (max-width: 768px)`
- Tablet boundary: `@media (max-width: 1200px)`

---

## ✅ Testing Quick Checklist

### Modal Testing
```
□ Desktop: Modal centered, icon visible
□ Mobile: Bottom sheet visible, slides up
□ Desktop: Close (X) button works
□ Desktop: Buttons clickable
□ Mobile: Touch-friendly sizes
□ All animations smooth
```

### Navbar Testing
```
□ Desktop: Logo visible, centered nav visible
□ Desktop: Logo click → /home
□ Mobile: Hamburger menu works
□ Mobile: Nav items in drawer
□ All: User profile button works
□ All: Logout → /login (not /login-admin)
```

---

## 🐛 Debugging

### Modal Not Showing
- Check if `ModalService` is provided in root
- Verify `GlobalModal` component is imported in `app.ts`
- Check console for service injection errors

### Navbar Layout Broken
- Check viewport size (use browser DevTools)
- Verify CSS media queries are correct
- Check if RouterModule is imported

### Logo Link Not Working
- Verify `routerLink="/home"` is present in HTML
- Check if `/home` route exists in `app.routes.ts`
- Ensure RouterModule is imported

### Logout Not Redirecting
- Check `/login` route exists
- Verify `router.navigate(['/login'])` is called
- Check if session is properly cleared
- Use browser DevTools to trace navigation

---

## 📚 Related Files

**Global Modal**:
- Template: `global-modal.html`
- Style: `global-modal.css`
- Logic: `global-modal.ts`
- Service: `service/modal.service.ts`

**Navbar**:
- Template: `navbar.html`
- Style: `navbar.css`
- Logic: `navbar.ts`
- Auth: `service/auth.service.ts`

---

## 💾 CSS Class Reference

### Modal Classes
```
.modal-overlay          - Background overlay
.modal-content          - Modal card container
.icon-wrapper           - Icon container wrapper
.icon-circle            - Circular background
.icon-container         - Icon SVG wrapper
.modal-body             - Content area
.modal-title            - Header text
.modal-text             - Description text
.modal-actions          - Button container
.btn-primary            - Main action button
.btn-secondary          - Cancel button
```

### Navbar Classes
```
.navbar                 - Toolbar container
.nav-left               - Left section (logo + menu)
.nav-center             - Center section (nav links)
.logo-link              - Clickable logo
.logo                   - Logo text
.menu-toggle            - Hamburger button
.nav-links              - Mobile menu drawer
.user-profile-card      - User info chip
.user-avatar            - Avatar image
```

---

## 🚀 Performance Tips

1. **Modal**: Uses CSS-only animations (no JavaScript for transitions)
2. **Navbar**: Uses CSS media queries (efficient responsive design)
3. **Logo**: Uses Angular RouterLink (no extra HTTP requests)
4. **Icons**: Uses SVG (scalable, crisp on all devices)

---

## 📖 Additional Resources

- Implementation Details: See `UI_UPDATES_SUMMARY.md`
- Testing Checklist: See `IMPLEMENTATION_CHECKLIST.md`
- Angular Router: https://angular.io/guide/router
- PrimeNG: https://primeng.org/
- CSS Media Queries: https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries

---

**Last Updated**: August 8, 2026
**Version**: 1.0.0
**Status**: ✅ Production Ready
