# Security Improvements TODO

This document tracks security enhancements and features that should be implemented to improve the overall security posture of the pbjs_engine platform.

## High Priority

### Authentication & Access Control

- [ ] **Add CAPTCHA to login after failed attempts**
  - Implement CAPTCHA (reCAPTCHA v3 or hCaptcha) after 3 failed login attempts
  - Prevent automated brute-force attacks on user accounts
  - Files to modify: `apps/api/src/routes/auth.ts`, `apps/admin/src/pages/LoginPage.tsx`
  - Consider using: [@hcaptcha/react-hcaptcha](https://www.npmjs.com/package/@hcaptcha/react-hcaptcha)

- [ ] **Implement account lockout policy**
  - Lock accounts temporarily after 5 failed login attempts
  - Implement exponential backoff (5min, 15min, 1hr, 24hr)
  - Send email notification on account lockout
  - Add unlock mechanism for administrators
  - Files to modify: `apps/api/src/routes/auth.ts`, `apps/api/src/db/schema.ts`

- [ ] **Add Two-Factor Authentication (2FA)**
  - Support TOTP-based 2FA (Google Authenticator, Authy)
  - Implement backup codes for account recovery
  - Add QR code generation for easy setup
  - Make 2FA optional but recommended for admin users
  - Consider using: [speakeasy](https://www.npmjs.com/package/speakeasy) and [qrcode](https://www.npmjs.com/package/qrcode)
  - Files to modify: `apps/api/src/routes/auth.ts`, `apps/api/src/db/schema.ts`

### Session Management

- [ ] **Improve session management**
  - Implement proper session storage (Redis or database-backed)
  - Add session timeout and renewal mechanisms
  - Implement "Remember Me" functionality with secure long-lived tokens
  - Add ability to view and revoke active sessions
  - Track session metadata (IP, user agent, location)
  - Files to modify: `apps/api/src/routes/auth.ts`, add new session management module

- [ ] **Add session activity logging**
  - Log all login/logout events
  - Track IP addresses and user agents
  - Implement suspicious activity detection
  - Send email alerts for logins from new devices/locations

## Medium Priority

### Network Security

- [ ] **Add WebSocket reconnection with exponential backoff**
  - Implement exponential backoff for SSE/WebSocket reconnections
  - Add connection state management
  - Prevent excessive reconnection attempts
  - Files to modify: `apps/admin/src/pages/admin/AnalyticsPage.tsx`

- [ ] **Implement IP-based rate limiting**
  - Rate limit by IP address in addition to user account
  - Implement different limits for different endpoints
  - Add allowlist/blocklist functionality
  - Consider using: [rate-limiter-flexible](https://www.npmjs.com/package/rate-limiter-flexible)
  - Files to modify: `apps/api/src/index.ts`, add rate limiting middleware

- [ ] **Add request signing for API keys**
  - Implement HMAC-based request signing for publisher API keys
  - Prevent API key replay attacks
  - Add request timestamp validation
  - Files to modify: `apps/api/src/routes/config.ts`

### Audit & Monitoring

- [ ] **Add security audit logging**
  - Log all security-relevant events (login, password change, permission changes)
  - Implement tamper-proof logging (write-only, append-only)
  - Add log retention policies
  - Create audit log viewer for administrators
  - Files to create: `apps/api/src/services/audit-log.ts`, `apps/api/src/routes/audit.ts`

- [ ] **Implement security headers middleware**
  - Add comprehensive security headers (CSP, HSTS, X-Frame-Options, etc.)
  - Configure Content Security Policy
  - Implement SRI for external scripts
  - Files to modify: `apps/api/src/index.ts`

- [ ] **Add vulnerability scanning**
  - Set up automated dependency scanning (Snyk, npm audit)
  - Implement regular security audits
  - Add pre-commit hooks for security checks

## Future Enhancements

### Advanced Authentication

- [ ] **Implement passwordless authentication**
  - Support magic link login via email
  - Support WebAuthn/FIDO2 for hardware keys
  - Add biometric authentication support
  - Consider using: [@simplewebauthn/server](https://www.npmjs.com/package/@simplewebauthn/server)

- [ ] **Add OAuth2/OIDC support**
  - Support login via Google, GitHub, Microsoft
  - Implement proper OAuth2 flow
  - Add account linking for multiple auth providers
  - Consider using: [passport](https://www.npmjs.com/package/passport)

- [ ] **Add API key rotation**
  - Implement automatic API key rotation
  - Support multiple active keys during transition
  - Add key expiration and renewal notifications

### Data Protection

- [ ] **Implement field-level encryption**
  - Encrypt sensitive fields in database (notes, custom parameters)
  - Use envelope encryption with key management service
  - Consider using: [crypto](https://nodejs.org/api/crypto.html) or AWS KMS

- [ ] **Add data retention policies**
  - Implement automatic data cleanup
  - Add GDPR-compliant data export/deletion
  - Support "right to be forgotten" requests

- [ ] **Implement backup encryption**
  - Encrypt database backups
  - Secure backup storage and transmission
  - Add backup verification and restoration testing

### Compliance & Governance

- [ ] **Add GDPR compliance features**
  - Implement cookie consent management
  - Add privacy policy acceptance tracking
  - Support data portability requests
  - Add data processing agreements

- [ ] **Implement SOC 2 controls**
  - Add access reviews and certifications
  - Implement change management processes
  - Add incident response procedures
  - Create security documentation

## Implementation Guidelines

### Before implementing any security feature:

1. **Research best practices** - Review OWASP guidelines and industry standards
2. **Document the design** - Create a design document outlining the approach
3. **Test thoroughly** - Write comprehensive tests including security test cases
4. **Peer review** - Have security changes reviewed by multiple team members
5. **Monitor impact** - Track metrics and monitor for unintended consequences

### Security Development Principles:

- **Defense in depth** - Implement multiple layers of security controls
- **Least privilege** - Grant minimum necessary permissions
- **Fail securely** - Ensure failures don't compromise security
- **Keep it simple** - Complex security systems are harder to audit and maintain
- **Security by default** - Secure configurations should be the default

## Resources

### Security Libraries & Tools:
- [helmet](https://www.npmjs.com/package/helmet) - Security headers for Express/Fastify
- [bcrypt](https://www.npmjs.com/package/bcrypt) - Password hashing (already in use)
- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) - JWT tokens (already in use)
- [rate-limiter-flexible](https://www.npmjs.com/package/rate-limiter-flexible) - Rate limiting
- [speakeasy](https://www.npmjs.com/package/speakeasy) - TOTP 2FA
- [express-validator](https://www.npmjs.com/package/express-validator) - Input validation

### Security Guidelines:
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

## Progress Tracking

Last Updated: 2026-02-01

Security improvements completed: 0/24
- High Priority: 0/4
- Medium Priority: 0/5
- Future Enhancements: 0/15

Next steps:
1. Start with CAPTCHA implementation
2. Implement account lockout policy
3. Add security audit logging
