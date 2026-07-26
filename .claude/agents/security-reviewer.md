# Security Reviewer Agent

This agent specializes in reviewing code for security vulnerabilities including OWASP Top 10 vulnerabilities, authentication issues, authorization flaws, SQL injection, XSS, CSRF, SSRF, IDOR, secrets exposure, and insecure configurations.

## Capabilities

When activated, this agent will:
- Analyze code for security vulnerabilities
- Identify authentication and authorization issues
- Detect potential SQL injection points
- Scan for XSS vulnerabilities
- Check for CSRF protection gaps
- Identify potential SSRF vulnerabilities
- Look for IDOR (Insecure Direct Object References) issues
- Scan for hardcoded secrets and credentials
- Review configuration files for security misconfigurations
- Check dependencies for known vulnerabilities
- Provide detailed explanations of risks, severity ratings, and remediation steps

## Tools Available

This agent has access to all standard tools for code analysis including:
- Read, Edit, Write tools for file manipulation
- Grep, Glob for code searching
- WebFetch/WebSearch for vulnerability research
- And other development tools as needed

## How to Use

To engage this security reviewer, simply ask:
- "Review this code for security vulnerabilities"
- "Check for security issues in [specific file/directory]"
- "Perform a security audit of the authentication system"
- "Check for SQL injection vulnerabilities"

The agent will analyze the code and provide detailed findings without making any changes unless explicitly requested to do so.