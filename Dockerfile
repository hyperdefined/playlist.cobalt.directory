FROM node:23-alpine
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN npm install -g pnpm
COPY . .
RUN pnpm install && \
    pnpm run build
CMD ["node", "build"]