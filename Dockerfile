# ============================================
# DOCKERFILE - GUÍA EDUCATIVA
# ============================================
# Este Dockerfile crea una imagen Docker para tu aplicación NestJS
# Cada paso está comentado para que entiendas qué hace

# PASO 1: Definir la imagen base
# Usamos Node.js versión 20 (LTS - Long Term Support)
# 'alpine' es una versión ligera de Linux (más pequeña y rápida)
FROM node:20-alpine

# PASO 2: Establecer el directorio de trabajo
# Todos los comandos siguientes se ejecutarán desde este directorio
WORKDIR /app

# PASO 3: Copiar los archivos de dependencias
# Primero copiamos package.json y package-lock.json
# Esto permite que Docker cachee las dependencias (optimización)
# Si solo cambias el código, no necesitas reinstalar node_modules
COPY package*.json ./

# PASO 4: Instalar las dependencias
# npm ci instala exactamente las versiones del package-lock.json
# Es más rápido y confiable que npm install
RUN npm install

# PASO 5: Copiar el resto del código de la aplicación
# Ahora copiamos todo el código fuente
COPY . .

# PASO 6: Compilar la aplicación TypeScript
# NestJS necesita compilar TypeScript a JavaScript antes de ejecutar
RUN npm run build

# PASO 7: Exponer el puerto
# Le decimos a Docker que este contenedor usa el puerto 3001
# (el mismo que configuraste en main.ts)
EXPOSE 3001

# PASO 8: Comando por defecto al iniciar el contenedor
# Cuando el contenedor se inicie, ejecutará este comando
# start:prod ejecuta el código compilado desde dist/main.js
CMD ["npm", "run", "start:prod"]

