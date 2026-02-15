import { HttpInterceptorFn } from '@angular/common/http';

/**
 * HTTP Interceptor to automatically include credentials (cookies) in all requests
 * This ensures authentication cookies are sent with every HTTP request
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Clone the request and add withCredentials option
  // This ensures cookies are sent with cross-origin requests
  const clonedRequest = req.clone({
    withCredentials: true
  });

  return next(clonedRequest);
};

