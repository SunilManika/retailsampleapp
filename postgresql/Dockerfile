FROM docker.io/library/postgres:16-alpine

# Copy initialization scripts into the image
# Scripts in /docker-entrypoint-initdb.d/ run in alphabetical order
COPY 00-create-user.sql /docker-entrypoint-initdb.d/00-create-user.sql
COPY full_dump.sql /docker-entrypoint-initdb.d/full_dump.sql

# Ensure correct permissions (runs as postgres user in base image)
RUN chown postgres:postgres /docker-entrypoint-initdb.d/00-create-user.sql /docker-entrypoint-initdb.d/full_dump.sql

USER postgres