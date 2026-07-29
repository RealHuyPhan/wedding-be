import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Country } from '../../country/entities/country.entity';

@Entity('states')
export class State {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  code: string;

  @Column()
  countryCode: string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  @ManyToOne(() => Country, (country: Country) => country.states, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'countryCode', referencedColumnName: 'code' })
  country: Country;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
