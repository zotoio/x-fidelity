# Use an official Node.js runtime as the base image
FROM node:20

# Set the working directory in the container
WORKDIR /usr/src/app

RUN yarn global add x-fidelity
RUN export PATH="$PATH:$(yarn global bin)"

# Expose the port the app runs on
EXPOSE 8888

# Define the command to run the app
CMD ["xfidelity", "--mode", "server", "--localConfig", "/usr/src/app/config"]
