FROM docker.io/library/postgres:16-alpine

# Copy initialization scripts into the image with correct ownership
# Scripts in /docker-entrypoint-initdb.d/ run in alphabetical order
COPY --chown=999:999 00-create-user.sql /docker-entrypoint-initdb.d/00-create-user.sql
COPY --chown=999:999 full_dump.sql /docker-entrypoint-initdb.d/full_dump.sql
