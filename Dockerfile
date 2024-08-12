# Use an official Node.js runtime as the base image
FROM node:20

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and yarn.lock etc
COPY package.json ./
COPY yarn.lock ./
COPY tsconfig.json ./

# Install the application dependencies
RUN yarn install

# Copy the rest of the application code
COPY ./src ./src

# Build the application
RUN yarn build

# Expose the port the app runs on
EXPOSE 8888

# Define the command to run the app
CMD ["node", "dist/index.js", "--mode", "server", "--localConfig", "/usr/src/app/config"]
