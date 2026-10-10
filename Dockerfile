# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS build
WORKDIR /app
# VITE_API_URL is baked into the JS bundle at build time (import.meta.env), so
# it must be a build argument; changing it later needs a rebuild. The build
# fails loudly if it is missing (see vite.config.ts).
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build


FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/security-headers.conf
# The CSP's connect-src must name the API the bundle talks to. Reduce
# VITE_API_URL to its origin (scheme + host[:port]) and bake it in; fail the
# build rather than ship a CSP that blocks every API call.
ARG VITE_API_URL
RUN API_ORIGIN=$(printf '%s' "$VITE_API_URL" | sed -E 's#^(https?://[^/]+).*#\1#') \
  && case "$API_ORIGIN" in http://*|https://*) ;; *) echo "VITE_API_URL must start with http:// or https://" >&2; exit 1;; esac \
  && sed -i "s|__API_ORIGIN__|$API_ORIGIN|g" /etc/nginx/security-headers.conf \
  && ! grep -q __API_ORIGIN__ /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
