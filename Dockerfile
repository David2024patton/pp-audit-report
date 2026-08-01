# ============================================================
# Audit Command Center — Static nginx container
# Zero build step. Serves src/ as root, data/ and assets/ aliased.
# ============================================================
FROM nginx:1.27-alpine

# Copy site files into the container layout
COPY src/ /app/src/
COPY data/ /app/data/
COPY assets/ /app/assets/

# nginx config
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=3s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
