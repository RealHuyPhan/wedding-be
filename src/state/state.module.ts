import { Module } from '@nestjs/common';
import { StateService } from './state.service';
import { StateController } from './state.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { State } from './entities/state.entity';
import { Country } from '../country/entities/country.entity';

@Module({
  imports: [TypeOrmModule.forFeature([State, Country])],
  exports: [StateService],
  controllers: [StateController],
  providers: [StateService],
})
export class StateModule {}
