FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p /userdata/db /userdata/uploads /userdata/certs && chmod +x start.sh
ENV DB_PATH=/userdata/db/messenger.db
ENV UPLOAD_DIR=/userdata/uploads
ENV CERT_DIR=/userdata/certs
EXPOSE 3000 3443 3090
CMD ["./start.sh"]
