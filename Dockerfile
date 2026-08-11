# Official Playwright image — Chromium + all its system libraries
# (like libglib) are already installed here, so we skip the problem entirely.
FROM mcr.microsoft.com/playwright:v1.48.0-jammy

WORKDIR /app

# Install dependencies first (better Docker layer caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
