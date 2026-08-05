import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import { Order } from "src/order/entities/order.entity";
import * as Handlebars from "handlebars";
import { EmailTemplateService } from "../email-template/email-template.service";
import { EmailTemplateCode } from "../email-template/entities/email-template.entity";
import { 
  getOrderConfirmationFallback, 
  getNewOrderAlertFallback, 
  getStatusUpdateFallback, 
  getFraudCancellationFallback 
} from "./email.fallback";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor(
    private configService: ConfigService,
    private emailTemplateService: EmailTemplateService,
  ) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  private compileTemplate(templateString: string, context: any): string {
    try {
      const template = Handlebars.compile(templateString);
      return template(context);
    } catch (error) {
      this.logger.error(`Error compiling Handlebars template: ${error}`);
      return templateString;
    }
  }

  async sendOrderConfirmation(order: Order): Promise<void> {
    const { id, user, shippingName, totalAmount, createdAt } = order;

    // Deduplicate items — TypeORM đôi khi trả duplicate rows khi join nested relations
    const items = [...new Map((order.items ?? []).map(item => [item.id, item])).values()];

    let html: string;
    let subject: string;

    const template = await this.emailTemplateService.findByCode(EmailTemplateCode.ORDER_CONFIRMATION);
    
    if (template) {
      const context = {
        id,
        shortId: id.slice(0, 8).toUpperCase(),
        user,
        shippingName,
        totalAmount,
        formattedTotal: Number(totalAmount).toFixed(2),
        createdAt: new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        items: items.map((item, index) => ({
          ...item,
          displayIndex: index + 1,
          formattedPrice: Number(item.price).toFixed(2),
          productName: item.product?.product || 'Product'
        })),
        frontendUrl: this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'
      };
      html = this.compileTemplate(template.contentHtml, context);
      subject = this.compileTemplate(template.subject || `Order Confirmed ✓ — #${id.slice(0, 8).toUpperCase()}`, context);
    } else {
      this.logger.warn(`Email template ${EmailTemplateCode.ORDER_CONFIRMATION} not found in database. Using fallback.`);
      const fallback = getOrderConfirmationFallback(order, this.configService);
      html = fallback.html;
      subject = fallback.subject;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to: user.email,
        subject,
        html,
      });
      if (error) {
        this.logger.error(`Failed to send order confirmation to ${user.email}: ${JSON.stringify(error)}`);
      } else {
        this.logger.log(`Order confirmation sent to ${user.email} — id: ${data?.id}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send order confirmation: ${String(err)}`);
    }
  }

  async sendNewOrderAlert(order: Order): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    if (!adminEmail) return;

    const { id, user, shippingName, totalAmount, shippingAddress, shippingCountry } = order;

    let html: string;
    let subject: string;

    const template = await this.emailTemplateService.findByCode(EmailTemplateCode.NEW_ORDER_ALERT);
    
    if (template) {
      const context = {
        id,
        shortId: id.slice(0, 8).toUpperCase(),
        user,
        shippingName,
        totalAmount,
        formattedTotal: Number(totalAmount).toFixed(2),
        shippingAddress,
        shippingCountry,
        frontendUrl: this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'
      };
      html = this.compileTemplate(template.contentHtml, context);
      subject = this.compileTemplate(template.subject || `New Order #${id.slice(0, 8).toUpperCase()} — $${Number(totalAmount).toFixed(2)} CAD`, context);
    } else {
      this.logger.warn(`Email template ${EmailTemplateCode.NEW_ORDER_ALERT} not found in database. Using fallback.`);
      const fallback = getNewOrderAlertFallback(order, this.configService);
      html = fallback.html;
      subject = fallback.subject;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to: adminEmail,
        subject,
        html,
      });
      if (error) {
        this.logger.error(`Failed to send admin alert to ${adminEmail}: ${JSON.stringify(error)}`);
      } else {
        this.logger.log(`New order alert sent to admin (${adminEmail}) — id: ${data?.id}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send admin alert: ${String(err)}`);
    }
  }

  async sendStatusUpdate(order: Order, newStatus: string): Promise<void> {
    // Chỉ gửi email nếu user có email
    if (!order.user?.email) return;

    // Map trạng thái sang mã template tương ứng
    const statusCodeMap: Record<string, EmailTemplateCode> = {
      PROCESSING: EmailTemplateCode.STATUS_PROCESSING,
      SHIPPING: EmailTemplateCode.STATUS_SHIPPING,
      DELIVERED: EmailTemplateCode.STATUS_DELIVERED,
      COMPLETED: EmailTemplateCode.STATUS_COMPLETED,
    };

    const templateCode = statusCodeMap[newStatus];
    if (!templateCode) return; // Không gửi email cho các trạng thái không cần thiết

    let html: string;
    let subject: string;

    const template = await this.emailTemplateService.findByCode(templateCode);
    
    const { id, shippingName, totalAmount } = order;

    if (template) {
      const context = {
        id,
        shortId: id.slice(0, 8).toUpperCase(),
        user: order.user,
        shippingName,
        totalAmount,
        formattedTotal: Number(totalAmount).toFixed(2),
        newStatus: newStatus.replace(/_/g, ' '),
        frontendUrl: this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'
      };
      html = this.compileTemplate(template.contentHtml, context);
      subject = this.compileTemplate(template.subject || `Order Status Update: ${newStatus}`, context);
    } else {
      this.logger.warn(`Email template ${templateCode} not found in database. Using fallback.`);
      const fallback = getStatusUpdateFallback(order, newStatus, this.configService);
      if (!fallback) return;
      html = fallback.html;
      subject = fallback.subject;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to: order.user.email,
        subject,
        html,
      });
      if (error) {
        this.logger.error(`Failed to send status update to ${order.user.email}: ${JSON.stringify(error)}`);
      } else {
        this.logger.log(`Status update email sent to ${order.user.email} — status: ${newStatus}, id: ${data?.id}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send status update email: ${String(err)}`);
    }
  }

  async sendFraudCancellationEmail(order: Order): Promise<void> {
    if (!order.user?.email) return;

    const { id, shippingName } = order;

    let html: string;
    let subject: string;

    const template = await this.emailTemplateService.findByCode(EmailTemplateCode.FRAUD_CANCELLATION);
    
    if (template) {
      const context = {
        id,
        shortId: id.slice(0, 8).toUpperCase(),
        user: order.user,
        shippingName,
        frontendUrl: this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'
      };
      html = this.compileTemplate(template.contentHtml, context);
      subject = this.compileTemplate(template.subject || `Order Cancelled - Payment Method Mismatch`, context);
    } else {
      this.logger.warn(`Email template ${EmailTemplateCode.FRAUD_CANCELLATION} not found in database. Using fallback.`);
      const fallback = getFraudCancellationFallback(order, this.configService);
      html = fallback.html;
      subject = fallback.subject;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to: order.user.email,
        subject,
        html,
      });
      if (error) {
        this.logger.error(`Failed to send fraud cancellation email to ${order.user.email}: ${JSON.stringify(error)}`);
      } else {
        this.logger.log(`Fraud cancellation email sent to ${order.user.email} — id: ${data?.id}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send fraud cancellation email: ${String(err)}`);
    }
  }
}


