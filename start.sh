#!/bin/bash
# LAN Messenger Start Script

CERT_DIR="${CERT_DIR:-/userdata/certs}"
CA_KEY="$CERT_DIR/ca.key"
CA_CRT="$CERT_DIR/ca.crt"
SERVER_KEY="$CERT_DIR/server.key"
SERVER_CRT="$CERT_DIR/server.crt"
SERVER_CSR="$CERT_DIR/server.csr"
EXT_FILE="$CERT_DIR/server.ext"

echo "🚀 Starting LAN Messenger..."
mkdir -p "$CERT_DIR"

if [ ! -f "$SERVER_KEY" ] || [ ! -f "$SERVER_CRT" ] || [ ! -f "$CA_CRT" ]; then
    echo "🔐 Generating LAN Certificate Authority and server certificate..."

    # ── Step 1: Create a private Root CA ────────────────────────────
    openssl genrsa -out "$CA_KEY" 4096 2>/dev/null
    openssl req -x509 -new -nodes \
        -key "$CA_KEY" \
        -sha256 -days 3650 \
        -out "$CA_CRT" \
        -subj "/C=IN/O=LAN Messenger CA/CN=LAN Messenger Root CA" 2>/dev/null
    echo "  ✅ Root CA created: ca.crt"

    # ── Step 2: Create server private key + CSR ──────────────────────
    openssl genrsa -out "$SERVER_KEY" 2048 2>/dev/null
    openssl req -new \
        -key "$SERVER_KEY" \
        -out "$SERVER_CSR" \
        -subj "/C=IN/O=LAN Messenger/CN=lan-messenger" 2>/dev/null

    # ── Step 3: Sign server cert with CA (with SAN for the LAN IP) ──
    # Use SERVER_IP env var if set, otherwise detect automatically
    if [ -n "$SERVER_IP" ]; then
        LAN_IP="$SERVER_IP"
    else
        LAN_IP=$(hostname -I | awk '{print $1}')
    fi
    cat > "$EXT_FILE" <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage=digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage=serverAuth
subjectAltName=@alt_names

[alt_names]
IP.1=${LAN_IP}
IP.2=127.0.0.1
IP.3=0.0.0.0
DNS.1=localhost
DNS.2=lan-messenger
EOF

    openssl x509 -req \
        -in "$SERVER_CSR" \
        -CA "$CA_CRT" \
        -CAkey "$CA_KEY" \
        -CAcreateserial \
        -out "$SERVER_CRT" \
        -days 3650 \
        -sha256 \
        -extfile "$EXT_FILE" 2>/dev/null

    echo "  ✅ Server certificate signed by CA (IP: ${LAN_IP})"
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────┐"
    echo "  │  📥 To remove browser warnings, install the CA cert:    │"
    echo "  │     http://${LAN_IP}:3000/ca.crt                        │"
    echo "  │  Then visit: https://${LAN_IP}:3443  ✅ Fully trusted   │"
    echo "  └─────────────────────────────────────────────────────────┘"
    echo ""
else
    echo "✅ Existing certificates found."
fi

npm start
