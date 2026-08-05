import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EmailService } from './email/email.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const emailService = app.get(EmailService);
  
  // Fake order
  const order = {
    id: 'test-id-12345678',
    user: { email: 'customer@example.com' },
    shippingName: 'John Doe',
    totalAmount: 199.99,
    shippingAddress: '123 Fake St',
    shippingCountry: 'CA',
  };

  console.log('Sending admin email...');
  try {
    await emailService.sendNewOrderAlert(order as any);
    console.log('Successfully called sendNewOrderAlert');
  } catch (err) {
    console.error('Error:', err);
  }

  await app.close();
}
bootstrap();
