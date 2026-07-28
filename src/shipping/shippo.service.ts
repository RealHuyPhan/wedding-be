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

  async getRates(addressTo: Record<string, any>, totalWeightKg: number, totalSets: number): Promise<Record<string, any>[]> {
    try {
      const addressFrom = {
        name: 'Wedding Store',
        street1: '19 Overlake Dr',
        city: 'Ottawa',
        state: 'ON',
        zip: 'K2E 6S6',
        country: 'CA',
      };

      let boxLength = '20';
      let boxWidth = '15';
      let boxHeight = '10';

      if (totalSets <= 50) {
        boxLength = '20'; boxWidth = '15'; boxHeight = '10';
      } else if (totalSets <= 150) {
        boxLength = '30'; boxWidth = '25'; boxHeight = '15';
      } else if (totalSets <= 300) {
        boxLength = '40'; boxWidth = '30'; boxHeight = '20';
      } else {
        boxLength = '50'; boxWidth = '40'; boxHeight = '30';
      }

      const parcel = {
        length: boxLength,
        width: boxWidth,
        height: boxHeight,
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

  async purchaseLabel(addressTo: Record<string, any>, parcel: Record<string, any>, serviceLevelToken: string): Promise<Record<string, any>> {
    try {
      const addressFrom = {
        name: 'Wedding Store',
        street1: '19 Overlake Dr',
        city: 'Ottawa',
        state: 'ON',
        zip: 'K2E 6S6',
        country: 'CA',
      };

      // 1. Create a shipment to generate fresh rates for these exact dimensions
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const shipment = await this.shippoClient.shipment.create({
        address_from: addressFrom,
        address_to: addressTo,
        parcels: [parcel],
        async: false,
      });

      // 2. Find the specific rate the customer selected
      type ShippoRate = { servicelevel?: { token: string }; object_id: string } & Record<string, any>;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const rates = (shipment.rates as ShippoRate[]) || [];
      const selectedRate = rates.find(r => r.servicelevel?.token === serviceLevelToken);

      if (!selectedRate) {
        throw new Error(`Could not find shipping rate for token: ${serviceLevelToken}. It might not be available for these box dimensions.`);
      }

      // 3. Purchase the label (Create Transaction)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const transaction = await this.shippoClient.transaction.create({
        rate: selectedRate.object_id,
        label_file_type: 'PDF',
        async: false,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (transaction.status !== 'SUCCESS') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        throw new Error(`Transaction failed: ${JSON.stringify(transaction.messages)}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return transaction;
    } catch (error) {
      this.logger.error('Failed to purchase Shippo label', error);
      throw error;
    }
  }
}
