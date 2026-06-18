FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

# We will volume mount the code in docker-compose for hot-reloading
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
