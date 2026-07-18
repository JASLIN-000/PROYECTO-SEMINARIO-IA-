import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('modulos')
export class Modulo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'nombre_modulo', type: 'varchar', length: 200, unique: true })
  nombreModulo!: string;

  @Column({ default: true })
  activo!: boolean;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'NOW()' })
  updatedAt!: Date;
}
