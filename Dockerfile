# Use an official Node.js runtime as the base image
FROM node:20

# Set the working directory in the container
WORKDIR /usr/src/app

ENV XFI_LISTEN_PORT=8888
ENV CERT_PATH=/usr/src/app/certs

RUN yarn global add x-fidelity
RUN export PATH="$PATH:$(yarn global bin)"

# Install OpenSSL
RUN apt-get update && apt-get install -y openssl

# Generate self-signed certificate
RUN openssl req -x509 -newkey rsa:4096 -keyout private-key.pem -out certificate.pem -days 365 -nodes -subj "/CN=localhost"

# Expose the port the app runs on
EXPOSE ${XFI_LISTEN_PORT}

# Copy the certificate and private key to the appropriate location
RUN mkdir -p $CERT_PATH && \
    mv private-key.pem certificate.pem $CERT_PATH/

# Define the command to run the app using shell form
CMD xfidelity --mode server --localConfig /usr/src/app/config
