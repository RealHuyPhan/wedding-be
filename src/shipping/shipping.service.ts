import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CanadaPostService } from './canada-post.service';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(
    private readonly canadaPostService: CanadaPostService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Tính kích thước Hộp carton và Trọng lượng kiện hàng dựa trên số lượng thiệp
   */
  private calculateParcelPackaging(totalCards: number = 50) {
    const cardWeightKg = parseFloat(this.configService.get<string>('CARD_WEIGHT_KG') || '0.04');
    const cards = Math.max(1, totalCards);
    const contentWeight = cards * cardWeightKg;

    let boxDimensions = { length: 20, width: 15, height: 5 };
    let boxWeight = 0.1;

    if (cards <= 50) {
      // Hộp Small (S)
      boxDimensions = { length: 20, width: 15, height: 5 };
      boxWeight = 0.1;
    } else if (cards <= 150) {
      // Hộp Medium (M)
      boxDimensions = { length: 25, width: 20, height: 10 };
      boxWeight = 0.2;
    } else if (cards <= 300) {
      // Hộp Large (L)
      boxDimensions = { length: 30, width: 22, height: 15 };
      boxWeight = 0.35;
    } else {
      // Hộp Extra Large (XL)
      boxDimensions = { length: 35, width: 25, height: 20 };
      boxWeight = 0.5;
    }

    const totalWeight = Number((contentWeight + boxWeight).toFixed(2));

    return {
      weight: totalWeight,
      dimensions: boxDimensions,
    };
  }

  async getRates(
    countryCode: string,
    postcode: string,
    totalCards: number = 50,
  ): Promise<{ rates: Array<{ serviceName: string; serviceCode: string; price: number; transitDays?: number }> }> {
    try {
      const defaultRates = [{ serviceName: 'Standard Shipping', serviceCode: 'DOM.EP', price: 20 }];

      if (!countryCode || !postcode) {
        return { rates: defaultRates };
      }

      const markupPercent = parseFloat(this.configService.get<string>('SHIPPING_MARKUP_PERCENT') || '17');
      const markupMultiplier = 1 + markupPercent / 100;

      const packaging = this.calculateParcelPackaging(totalCards);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Shipping rate fetch timeout from Canada Post')), 15000)
      );

      const liveRates = await Promise.race([
        this.canadaPostService.getRates(postcode, countryCode, packaging),
        timeoutPromise,
      ]);

      if (liveRates && liveRates.length > 0) {
        const ratesWithMarkup = liveRates.map((rate) => ({
          ...rate,
          price: Number((rate.price * markupMultiplier).toFixed(2)),
        }));
        return { rates: ratesWithMarkup };
      }

      return { rates: defaultRates };
    } catch (error) {
      this.logger.error('Failed to get shipping rates', error);
      return { rates: [{ serviceName: 'Standard Shipping', serviceCode: 'DOM.EP', price: 20 }] };
    }
  }
}
