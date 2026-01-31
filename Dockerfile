FROM nginx:alpine

LABEL maintainer="Encyphrix Team"
LABEL description="Paranoid-grade encryption web app - Client-side only"
LABEL version="0.1.0"

RUN apk update && \
    apk upgrade && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

RUN rm -rf /usr/share/nginx/html/*

COPY nginx.docker.conf /etc/nginx/conf.d/default.conf
COPY src/ /usr/share/nginx/html/

RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
