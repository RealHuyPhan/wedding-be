import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
const shippo = require('shippo');

@Injectable()
export class ShippoService {
  private shippoClient: any;
  private readonly logger = new Logger(ShippoService.name);

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('SHIPPO_API_KEY') || 'shippo_test_dummy';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this.shippoClient = shippo(token);
  }

  async getRates(addressTo: Record<string, any>, totalWeightKg: number): Promise<Record<string, any>[]> {
    try {
      const addressFrom = {
        name: 'Wedding Store',
        street1: '19 Overlake Dr',
        city: 'Ottawa',
        state: 'ON',
        zip: 'K2E 6S6',
        country: 'CA',
      };

      const parcel = {
        length: '20',
        width: '15',
        height: '10',
        distance_unit: 'cm',
        weight: totalWeightKg.toString(),
        mass_unit: 'kg',
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const shipment = await this.shippoClient.shipment.create({
        address_from: addressFrom,
        address_to: addressTo,
        parcels: [parcel],
        async: false,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return (shipment.rates as Record<string, any>[]) || [];
    } catch (error) {
      this.logger.error('Failed to get Shippo rates', error);
      throw error;
    }
  }
}
