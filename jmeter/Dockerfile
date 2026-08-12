# JMeter Container for Load Testing
FROM alpine:3.18

# Install dependencies
RUN apk add --no-cache \
    openjdk17-jre \
    bash \
    curl \
    tar

# Install JMeter
ENV JMETER_VERSION=5.6.3
ENV JMETER_HOME=/opt/jmeter

RUN mkdir -p ${JMETER_HOME} && \
    cd /tmp && \
    curl -O https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-${JMETER_VERSION}.tgz && \
    tar -xzf apache-jmeter-${JMETER_VERSION}.tgz && \
    mv apache-jmeter-${JMETER_VERSION}/* ${JMETER_HOME}/ && \
    rm -rf /tmp/apache-jmeter-${JMETER_VERSION}*

# Set working directory
WORKDIR /jmeter

# Copy JMeter test files
COPY retail_spike.jmx .
COPY users.csv .
COPY run_spike.sh .

# Make scripts executable
RUN chmod +x run_spike.sh

# Set environment variables
ENV PATH="${JMETER_HOME}/bin:${PATH}"
# OpenShift assigns a random UID with no home directory.
# Setting HOME=/tmp prevents Java prefs warnings and ensures
# any library that needs a writable home dir can function.
ENV HOME=/tmp

# Default command
CMD ["bash"]

# Made with Bob
