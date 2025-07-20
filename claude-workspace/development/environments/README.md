# Environment Configuration

This directory contains environment configuration files for different deployment environments.

## Files

### `.env.development`
- **Purpose**: Local development environment variables
- **Usage**: Automatically loaded by development scripts
- **Contains**: Database URLs, service ports, development flags

### Future Environment Files
- `.env.staging` - Staging environment configuration
- `.env.production.template` - Production environment template (no secrets)

## Usage

Environment files are automatically loaded by:
- Development scripts in `../scripts/development/`
- Individual service development servers
- Docker Compose configurations

## Security Notes

- **Never commit** production secrets to version control
- Use `.env.production.template` for production structure
- Actual production secrets should be managed through:
  - Google Cloud Secret Manager
  - Kubernetes secrets
  - CI/CD pipeline variables

## Environment Variables Structure

All environment files follow the same structure:
- Application settings (NODE_ENV, LOG_LEVEL)
- Database configurations
- Cache and messaging (Redis, NATS)
- Service ports and URLs
- External service configurations
- Development tools settings