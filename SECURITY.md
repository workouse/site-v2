# Security Policy

## Supported versions

This is a static portfolio website. There is no backend, no user data stored, and no authentication system. The attack surface is minimal by design.

| Version | Supported |
|---------|-----------|
| `master` branch | ✅ Active |

## Reporting a vulnerability

If you discover a security issue — for example, a misconfigured HTTP header, a dependency with a known CVE, or a CSP bypass — please report it **privately** before opening a public issue.

**Contact:** z@emre.xyz  
**PGP / preferred format:** Plain text is fine. Describe the issue, steps to reproduce, and potential impact.

I aim to acknowledge all reports within **48 hours** and resolve valid issues within **7 days**.

Please do not open a public GitHub issue for security vulnerabilities.

## Out of scope

- Self-XSS (requires the user to attack themselves)
- Issues in Cloudflare's infrastructure (report those to Cloudflare directly)
- Theoretical vulnerabilities with no practical impact on a static site
