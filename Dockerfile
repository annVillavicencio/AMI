FROM node:20-alpine

WORKDIR /app

# Copiar dependencias e instalar
COPY Backend/package*.json ./Backend/
WORKDIR /app/Backend
RUN npm install

# Copiar el código fuente completo
WORKDIR /app
COPY Backend ./Backend
COPY Fronted ./Fronted

WORKDIR /app/Backend

EXPOSE 3000

CMD ["sh", "-c", "node initDb.js && node server.js"]
