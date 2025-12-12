import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export const typeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  // Configuración SSL: para bases de datos que requieren SSL (como Render PostgreSQL)
  const sslEnabled =
    configService.get('DATABASE_SSL') === 'true' || configService.get('DATABASE_SSL') === true;
  const sslConfig = sslEnabled
    ? { rejectUnauthorized: false } // Para servicios como Render que requieren SSL pero sin verificación estricta
    : false;

  return {
    type: 'postgres',
    host: configService.get('DATABASE_HOST'),
    port: configService.get('DATABASE_PORT'),
    username: configService.get('DATABASE_USER'),
    password: configService.get('DATABASE_PASS'),
    database: configService.get('DATABASE_NAME'),
    ssl: sslConfig,
    logging: false,
    entities: [join(__dirname + '../../**/*.entity.{js,ts}')],
    synchronize: true,
  };
};
