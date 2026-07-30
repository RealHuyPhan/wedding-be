import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingService } from '../setting/setting.service';

@Injectable()
export class CanadaPostService {
  private readonly logger = new Logger(CanadaPostService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(
    private configService: ConfigService,
    private settingService: SettingService,
  ) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const apiKey = this.configService.get<string>('CANADA_POST_API_KEY');
    const apiSecret = this.configService.get<string>('CANADA_POST_API_SECRET');

    if (!apiKey || !apiSecret) {
      throw new Error('Canada Post API Key and Secret are not configured.');
    }

    const tokenUrl = 'https://api.canadapost-postescanada.ca/prod/devportal-portaildesdeveloppeurs/cpc-api-native-oauth-provider/oauth2/token';

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('scope', 'merchant');

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'X-IBM-Client-Id': apiKey,
          'X-IBM-Client-Secret': apiSecret,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params,
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`Failed to get access token: ${errorData}`);
        throw new Error('Failed to authenticate with Canada Post OAuth API');
      }

      const data = (await response.json()) as { access_token: string; expires_in: number };
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
      
      return this.accessToken;
    } catch (error) {
      this.logger.error('Error fetching Canada Post OAuth token', error);
      throw error;
    }
  }

  async getRates(
    destinationZip: string,
    destinationCountryCode: string,
    parcelOptions?: {
      weight?: number;
      dimensions?: { length: number; width: number; height: number };
    },
  ): Promise<Array<{ serviceName: string, serviceCode: string, price: number, transitDays?: number }> | null> {
    try {
      const token = await this.getAccessToken();
      
      let originZip = await this.settingService.getValue('CANADA_POST_ORIGIN_POSTAL_CODE');
      if (!originZip) {
        originZip = this.configService.get<string>('CANADA_POST_ORIGIN_POSTAL_CODE') || 'K2E5V2';
      }
      const customerNumber = this.configService.get<string>('CANADA_POST_CUSTOMER_NUMBER');

      const url = 'https://api.canadapost-postescanada.ca/prod/devportal-portaildesdeveloppeurs/rating/v1/prices';

      interface CanadaPostOasPayload {
        customerNumber?: string;
        quoteType?: string;
        services?: string[];
        parcelCharacteristics: {
          weight: number;
          dimensions?: {
            length: number;
            width: number;
            height: number;
          };
        };
        originPostalCode: string;
        destination: {
          domestic?: { postalCode: string };
          unitedStates?: { zipCode: string };
          international?: { countryCode: string };
        };
      }

      const weight = parcelOptions?.weight && parcelOptions.weight > 0 ? parcelOptions.weight : 1.0;
      const dimensions = parcelOptions?.dimensions || { length: 20, width: 15, height: 5 };

      const basePayload: CanadaPostOasPayload = {
        quoteType: customerNumber ? 'commercial' : 'counter',
        parcelCharacteristics: {
          weight,
          dimensions,
        },
        originPostalCode: originZip.replace(/\s+/g, '').toUpperCase(),
        destination: {},
      };

      if (customerNumber) {
        basePayload.customerNumber = customerNumber;
      }

      let destCountry = destinationCountryCode.trim().toUpperCase();
      if (destCountry === 'USA') destCountry = 'US';
      if (destCountry === 'CAN') destCountry = 'CA';

      const cleanZip = destinationZip.replace(/\s+/g, '').toUpperCase();

      if (destCountry === 'CA') {
        basePayload.destination.domestic = { postalCode: cleanZip };
      } else if (destCountry === 'US') {
        basePayload.destination.unitedStates = { zipCode: cleanZip };
      } else {
        basePayload.destination.international = { countryCode: destCountry };
      }

      type PriceQuote = {
        serviceCode: string;
        serviceName: string;
        priceDetails?: {
          base?: number;
          due?: number;
          adjustments?: Array<{ adjustmentName?: string; adjustmentCost?: number }>;
          options?: Array<{ optionName?: string; qualifier?: { included?: boolean } }>;
        };
        serviceStandard?: {
          expectedTransitTime?: number;
          expectedDeliveryDate?: string;
          guaranteedDelivery?: boolean;
        };
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Language': 'en-CA',
        },
        body: JSON.stringify(basePayload),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Canada Post rating API failed: ${errText}`);
        return null;
      }

      const quotes = (await response.json()) as PriceQuote[];

      if (!Array.isArray(quotes) || quotes.length === 0) {
        return null;
      }

      // Format lại danh sách các tuỳ chọn vận chuyển với đầy đủ thông tin chi tiết
      const rates = quotes.map((quote) => {
        const cost = typeof quote.priceDetails?.due === 'number' ? quote.priceDetails.due : parseFloat(String(quote.priceDetails?.due || 0));
        const base = typeof quote.priceDetails?.base === 'number' ? quote.priceDetails.base : parseFloat(String(quote.priceDetails?.base || 0));
        
        const fuelAdj = quote.priceDetails?.adjustments?.find(a => a.adjustmentName?.toLowerCase().includes('fuel'));
        const fuelSurcharge = fuelAdj ? Number(fuelAdj.adjustmentCost || 0) : 0;

        const includedOpts = (quote.priceDetails?.options || [])
          .map(o => o.optionName || '')
          .filter(Boolean);

        return {
          serviceCode: quote.serviceCode || 'Unknown',
          serviceName: quote.serviceName || 'Standard Shipping',
          price: isNaN(cost) ? 20 : cost,
          basePrice: isNaN(base) ? undefined : base,
          fuelSurcharge: fuelSurcharge > 0 ? fuelSurcharge : undefined,
          transitDays: quote.serviceStandard?.expectedTransitTime,
          expectedDeliveryDate: quote.serviceStandard?.expectedDeliveryDate,
          guaranteedDelivery: !!quote.serviceStandard?.guaranteedDelivery,
          includedOptions: includedOpts.length > 0 ? includedOpts : undefined,
        };
      }).sort((a, b) => a.price - b.price); // Sắp xếp rẻ nhất lên đầu

      return rates;
    } catch (error) {
      this.logger.error('Error fetching rates from Canada Post', error);
      return null;
    }
  }
}
