#!/bin/bash
# Generate self-signed certificates for local development

if [ ! -d "cert" ]; then
    mkdir cert
fi

cd cert

if [ -f "cert.pem" ] && [ -f "key.pem" ]; then
    echo "✅ SSL certificates already exist"
    exit 0
fi

echo "🔐 Generating self-signed SSL certificates for local development..."

# Check if mkcert is available (recommended)
if command -v mkcert &> /dev/null; then
    echo "Using mkcert for certificate generation..."
    mkcert -key-file key.pem -cert-file cert.pem localhost 127.0.0.1 ::1
else
    echo "Using OpenSSL for certificate generation..."
    # Generate private key
    openssl genrsa -out key.pem 2048
    
    # Generate certificate signing request
    openssl req -new -key key.pem -out cert.csr -subj "/C=US/ST=Development/L=Development/O=PWA Kit/OU=Development/CN=localhost"
    
    # Generate self-signed certificate
    openssl x509 -req -days 365 -in cert.csr -signkey key.pem -out cert.pem
    
    # Clean up
    rm cert.csr
fi

echo "✅ SSL certificates generated successfully!"
echo "📁 Certificates saved in cert/ directory"
echo "⚠️  These are self-signed certificates for development only"
echo "🔒 Your browser will show a security warning - this is normal"
echo ""
echo "Next steps:"
echo "1. npm run dev (starts HTTPS development server)"
echo "2. Accept the browser security warning"
echo "3. Test PWA features with HTTPS"