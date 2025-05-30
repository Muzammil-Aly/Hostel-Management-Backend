# Use the official Node.js image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Expose the port (change if your app uses a different one)
EXPOSE 8002

# Start the app
CMD ["node", "--experimental-json-modules", "src/index.js"]
