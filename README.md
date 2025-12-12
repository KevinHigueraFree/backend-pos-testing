
# To run service

## Option 1: With docker-compose

### Up service
```bash
# Build and up service
docker-compose up --build 

# Run service on dev
docker-compose up

# Run service on production
docker-compose up -d
```

### Stop service
```bash
# Stop and remove containers, networks
docker-compose down

# Stop and remove containers, networks, AND volumes
docker-compose down -v
```

## Utils comands

```bash
# Watch runing containers
docker ps

# Watch real time logs
docker-compose logs -f backend

# Stop container
docker stop pos_backend

# Start stopped container
docker start pos_backend

# Remove container
docker rm pos_backend

# Execute seed to create registers categories and products on data base
docker-compose exec backend npm run seed
```

## Option 2: With npm on terminal
### Project setup

```bash
$ npm install
```

### Compile and run the project

```bash
# development
$ npm run start

# Watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

### Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# unit test coverage
$ npm run test:cov

# e2e test coverage
$ npm run test:cov:e2e
```

### Utils comands

```bash
# Create default registers products and categories
npm run seed
```
