FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias del backend
COPY Backend/package*.json ./Backend/

# Instalar dependencias dentro de Backend
WORKDIR /app/Backend
RUN npm install

# Regresar a /app y copiar el código completo
WORKDIR /app
COPY Backend ./Backend
COPY Fronted ./Fronted

# Directorio de trabajo final
WORKDIR /app/Backend

EXPOSE 3000

CMD ["node", "server.js"]
