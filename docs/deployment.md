# Deployment Guide

## Overview

Encyphrix can be deployed in various environments, from local development to production servers. This guide covers all deployment options.

## Quick Start

### Option 1: Direct File Access (Simplest)

Just open the HTML file in a browser:
```bash
# No server needed!
open src/index.html
```

Works completely offline with `file://` protocol.

### Option 2: Local Server

For development or local access:
```bash
# Using Python
python3 -m http.server 8000 --directory src

# Using Bun
bun run serve

# Using Node
npx serve src
```

Then open: http://localhost:8000

### Option 3: Docker (Recommended for Production)

```bash
# Build and run
docker-compose up -d

# Access at http://localhost:80
```

## Docker Deployment

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/yourusername/encyphrix.git
cd encyphrix
```

2. Start the container:
```bash
docker-compose up -d
```

3. Access the app:
- Local: http://localhost
- Network: http://your-server-ip

4. Stop the container:
```bash
docker-compose down
```

### Using Docker Directly

```bash
# Build image
docker build -t encyphrix .

# Run container
docker run -d -p 80:80 --name encyphrix encyphrix

# View logs
docker logs encyphrix

# Stop and remove
docker stop encyphrix && docker rm encyphrix
```

### Docker Configuration

The provided `Dockerfile`:
- Uses `nginx:alpine` (minimal, ~20MB)
- Copies static files to nginx html directory
- Includes security headers
- Runs as non-root user

The `docker-compose.yml`:
- Maps port 80 to host
- Enables easy scaling
- Supports environment variables

## Production Deployment

### Requirements

- Web server (nginx, Apache, or any static file server)
- HTTPS (TLS 1.2+)
- Security headers (HSTS, CSP, etc.)

### nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name encyphrix.example.com;

    # SSL certificates
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Content-Security-Policy "default-src 'none'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'none'; font-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none';" always;

    # Static files
    location / {
        root /var/www/encyphrix;
        index index.html;
        try_files $uri $uri/ =404;
    }

    # Cache static assets
    location ~* \.(js|css|html)$ {
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name encyphrix.example.com;
    return 301 https://$server_name$request_uri;
}
```

### Apache Configuration

```apache
<VirtualHost *:443>
    ServerName encyphrix.example.com
    DocumentRoot /var/www/encyphrix

    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem

    # Security headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Frame-Options "DENY"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "no-referrer"
    Header always set Content-Security-Policy "default-src 'none'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'none'; font-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none';"

    <Directory /var/www/encyphrix>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>
```

### Cloud Deployment

#### AWS S3 + CloudFront

1. Create S3 bucket
2. Upload `index.html`
3. Enable static website hosting
4. Create CloudFront distribution
5. Configure HTTPS with ACM

#### Netlify

1. Drag and drop `src/` folder to Netlify
2. Or connect Git repository
3. Deploy automatically on push

#### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### GitHub Pages

1. Push code to GitHub
2. Enable GitHub Pages in repository settings
3. Select source branch
4. Access at `https://username.github.io/repo-name`

## Security Considerations

### HTTPS Required

Always use HTTPS in production:
- Prevents MITM attacks
- Required for Web Crypto API in some browsers
- Enables secure CSP headers

### Security Headers

Essential headers (already in nginx.conf):
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy` (CSP)
- `X-Frame-Options` (clickjacking protection)
- `X-Content-Type-Options` (MIME sniffing protection)

### Server Hardening

1. Disable server tokens:
```nginx
server_tokens off;
```

2. Limit request size:
```nginx
client_max_body_size 1m;
```

3. Enable rate limiting:
```nginx
limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;
limit_req zone=one burst=20 nodelay;
```

## Monitoring

### Health Check

Simple health endpoint:
```bash
# Check if server is responding
curl -f http://localhost/ || echo "Server down"
```

### Logs

Docker logs:
```bash
docker logs -f encyphrix
```

nginx logs:
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Backup and Recovery

### Backup Strategy

The app is a single HTML file - backup is simple:
```bash
# Backup
cp src/index.html backups/encyphrix-$(date +%Y%m%d).html

# Or use git
git add src/index.html
git commit -m "Backup version"
git push
```

### Recovery

```bash
# Restore from backup
cp backups/encyphrix-20240130.html src/index.html

# Or from git
git checkout HEAD -- src/index.html
```

## Troubleshooting

### 404 Errors

Check file path:
```bash
ls -la /var/www/encyphrix/index.html
```

### CSP Violations

Check browser console for CSP errors. Common issues:
- External scripts blocked
- Inline styles blocked
- WASM execution blocked

### WASM Loading Fails

Ensure proper MIME type:
```nginx
types {
    application/wasm wasm;
}
```

### Slow Performance

1. Enable gzip compression:
```nginx
gzip on;
gzip_types text/html text/css application/javascript;
```

2. Enable browser caching:
```nginx
location ~* \.(js|css|html)$ {
    expires 1h;
}
```

## Scaling

### Horizontal Scaling

Since Encyphrix is stateless:
```bash
# Run multiple instances
docker-compose up -d --scale encyphrix=3

# Use load balancer (nginx, HAProxy, etc.)
```

### CDN Distribution

For global distribution:
1. Upload to S3/CloudFront
2. Or use Cloudflare
3. Or use Fastly

## Support

For deployment issues:
1. Check logs first
2. Verify file permissions
3. Test with curl/browser DevTools
4. Review security headers
5. File an issue with details
