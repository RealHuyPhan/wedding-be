import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import { Order } from "src/order/entities/order.entity";

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private resend: Resend;

    constructor(private configService: ConfigService) {
        this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    }

    async sendOrderConfirmation(order: Order): Promise<void> {
        const { id, user, shippingName, totalAmount, createdAt } = order;

        // Deduplicate items — TypeORM đôi khi trả duplicate rows khi join nested relations
        const items = [...new Map((order.items ?? []).map(item => [item.id, item])).values()];

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f5ede6;font-family:Georgia,serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5ede6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff9f5;border-radius:4px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07);">

          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(160deg,#f7ede4 0%,#eeddd2 40%,#e5cfc3 100%);padding:48px 40px 36px;text-align:center;position:relative;overflow:hidden;">

              <!-- Floral decor TOP-LEFT -->
              <div style="position:absolute;top:-4px;left:-4px;">
                <svg width="130" height="130" viewBox="0 0 130 130" fill="none">
                  <!-- stems -->
                  <path d="M10 120 Q30 80 60 50" stroke="#c4a882" stroke-width="1.2" fill="none" opacity="0.5"/>
                  <path d="M10 120 Q20 70 45 40" stroke="#c4a882" stroke-width="1" fill="none" opacity="0.35"/>
                  <!-- leaves -->
                  <ellipse cx="45" cy="55" rx="9" ry="5" fill="#c9b48a" opacity="0.35" transform="rotate(-40 45 55)"/>
                  <ellipse cx="60" cy="38" rx="8" ry="4" fill="#bfaa80" opacity="0.3" transform="rotate(-55 60 38)"/>
                  <!-- flowers -->
                  <circle cx="62" cy="48" r="5" fill="#e0b5a0" opacity="0.55"/>
                  <circle cx="62" cy="48" r="2.5" fill="#c8856a" opacity="0.5"/>
                  <circle cx="47" cy="34" r="4" fill="#d9a898" opacity="0.5"/>
                  <circle cx="47" cy="34" r="2" fill="#b87060" opacity="0.45"/>
                  <circle cx="30" cy="22" r="3" fill="#e5c0b0" opacity="0.4"/>
                  <!-- small buds -->
                  <circle cx="72" cy="30" r="2.5" fill="#dba898" opacity="0.4"/>
                  <circle cx="55" cy="20" r="2" fill="#cfa090" opacity="0.35"/>
                </svg>
              </div>

              <!-- Floral decor BOTTOM-RIGHT (mirror) -->
              <div style="position:absolute;bottom:-4px;right:-4px;transform:rotate(180deg);">
                <svg width="110" height="110" viewBox="0 0 130 130" fill="none">
                  <path d="M10 120 Q30 80 60 50" stroke="#c4a882" stroke-width="1.2" fill="none" opacity="0.4"/>
                  <path d="M10 120 Q20 70 45 40" stroke="#c4a882" stroke-width="1" fill="none" opacity="0.25"/>
                  <ellipse cx="45" cy="55" rx="9" ry="5" fill="#c9b48a" opacity="0.3" transform="rotate(-40 45 55)"/>
                  <circle cx="62" cy="48" r="5" fill="#e0b5a0" opacity="0.45"/>
                  <circle cx="62" cy="48" r="2.5" fill="#c8856a" opacity="0.4"/>
                  <circle cx="47" cy="34" r="4" fill="#d9a898" opacity="0.4"/>
                  <circle cx="30" cy="22" r="3" fill="#e5c0b0" opacity="0.35"/>
                </svg>
              </div>

              <!-- Brand Name -->
              <h1 style="margin:8px 0 4px;font-size:54px;color:#5c3020;font-family:Georgia,serif;font-weight:normal;font-style:italic;letter-spacing:3px;line-height:1;">
                Duyen
              </h1>
              <!-- Ornament line -->
             
              <!-- Subtitle -->
              <p style="margin:0;font-size:12px;letter-spacing:2px;color:#9a7860;text-transform:uppercase;font-family:Arial,sans-serif;">
                Order Confirmed
              </p>
            </td>
          </tr>

          <!-- Order ID & Date -->
          <tr>
            <td style="padding:20px 40px 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9a8880;letter-spacing:2px;text-transform:uppercase;">
                Order #${id.slice(0, 8).toUpperCase()} &nbsp;·&nbsp; ${new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:24px 40px 8px;">
              <p style="margin:0;font-size:14px;color:#6a5a50;line-height:1.7;">
                Hi <strong style="color:#5c3325;">${shippingName}</strong>,
              </p>
              <p style="margin:8px 0 0;font-size:14px;color:#6a5a50;line-height:1.7;">
                We're delighted to confirm your order. Below is a summary of the beautiful items you've chosen:
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:20px 40px;">
              <div style="border-top:1px solid #e0d4cc;"></div>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding:0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <thead>
                  <tr>
                    <th style="padding:8px 16px 12px;text-align:left;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#9a8070;font-weight:normal;font-family:Arial,sans-serif;">
                      ITEM
                    </th>
                    <th style="padding:8px 16px 12px;text-align:center;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#9a8070;font-weight:normal;font-family:Arial,sans-serif;">
                      QTY
                    </th>
                    <th style="padding:8px 16px 12px;text-align:right;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#9a8070;font-weight:normal;font-family:Arial,sans-serif;">
                      PRICE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${items?.map((item, index) => `
                  <tr>
                    <!-- ITEM: tên sản phẩm -->
                    <td style="padding:14px 16px;border-bottom:1px dashed #e8ddd4;color:#4a3728;font-size:13px;">
                      ${index + 1}. ${item.product?.product || 'Product'}
                    </td>
                    <!-- QTY: số lượng -->
                    <td style="padding:14px 16px;border-bottom:1px dashed #e8ddd4;text-align:center;color:#7a6a5a;font-size:13px;">
                      ×${item.quantity}
                    </td>
                    <!-- PRICE: đơn giá -->
                    <td style="padding:14px 16px;border-bottom:1px dashed #e8ddd4;text-align:right;color:#7a6a5a;font-size:13px;">
                      $${Number(item.price).toFixed(2)}
                    </td>
                  </tr>
                  `).join('') ?? ''}
                  <!-- Total Row -->
                  <tr>
                    <td colspan="2" style="padding:16px 16px 8px;text-align:right;font-size:12px;letter-spacing:1px;color:#9a8070;text-transform:uppercase;font-family:Arial,sans-serif;">
                      Total
                    </td>
                    <td style="padding:16px 16px 8px;text-align:right;font-size:16px;font-weight:bold;color:#5c3325;font-family:Georgia,serif;">
                      $${Number(totalAmount).toFixed(2)} <span style="font-size:11px;font-weight:normal;color:#9a8070;">CAD</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:20px 40px;">
              <div style="border-top:1px solid #e0d4cc;"></div>
            </td>
          </tr>

          <!-- Gift Name / User section -->
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;color:#9a8070;text-transform:uppercase;font-family:Arial,sans-serif;">
                customer
              </p>
              <p style="margin:0;font-size:26px;color:#5c3325;font-family:Georgia,serif;font-style:italic;">
                ${shippingName}
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:0 40px 16px;text-align:center;">
              <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/orders/${id}"
                 style="display:inline-block;padding:13px 32px;background:#5c3325;color:#fff;text-decoration:none;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;border-radius:2px;">
                View My Order
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 40px 32px;text-align:center;background:linear-gradient(to bottom,#f2e8e0,#ede0d5);border-top:1px solid #ddd0c4;">
              <p style="margin:0 0 6px;font-size:22px;color:#7a5040;font-family:Georgia,serif;font-style:italic;letter-spacing:2px;">
                Duyen
              </p>
              <p style="margin:0;font-size:12px;color:#9a8070;font-family:Georgia,serif;font-style:italic;">
                Thank you for choosing us for your special day.
              </p>
              <p style="margin:10px 0 0;font-size:10px;color:#b8a898;font-family:Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;">
                Questions? Visit our store
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
        `;

        try {
            const { data, error } = await this.resend.emails.send({
                from: 'onboarding@resend.dev',
                to: user.email,
                subject: `Order Confirmed ✓ — #${id.slice(0, 8).toUpperCase()}`,
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
        const { id, user, shippingName, totalAmount, shippingAddress, shippingCountry } = order;
        const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
        <h2 style="color:#5c0a1a">🛍️ New Order Received!</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px;color:#888">Order ID</td><td>#${id.slice(0, 8).toUpperCase()}</td></tr>
          <tr><td style="padding:6px;color:#888">Customer</td><td>${shippingName} (${user.email})</td></tr>
          <tr><td style="padding:6px;color:#888">Total</td><td><strong>$${Number(totalAmount).toFixed(2)} CAD</strong></td></tr>
          <tr><td style="padding:6px;color:#888">Address</td><td>${shippingAddress}, ${shippingCountry}</td></tr>
        </table>
        <p><a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/admin/orders/${id}" 
              style="background:#5c0a1a;color:white;padding:10px 20px;text-decoration:none;border-radius:4px">
          View Order
        </a></p>
      </div>
    `;
        try {
            const { data: d2, error: e2 } = await this.resend.emails.send({
                from: 'onboarding@resend.dev',
                to: adminEmail!,
                subject: `New Order #${id.slice(0, 8).toUpperCase()} — $${Number(totalAmount).toFixed(2)} CAD`,
                html,
            });
            if (e2) {
                this.logger.error(`Failed to send admin alert to ${adminEmail}: ${JSON.stringify(e2)}`);
            } else {
                this.logger.log(`New order alert sent to admin (${adminEmail}) — id: ${d2?.id}`);
            }
        } catch (err) {
            this.logger.error(`Failed to send admin alert: ${String(err)}`);
        }
    }

    // Email 3: Thông báo đổi trạng thái → gửi cho User
    async sendStatusUpdate(order: Order, newStatus: string): Promise<void> {
        // Chỉ gửi email nếu user có email
        if (!order.user?.email) return;

        // Map trạng thái sang thông điệp thân thiện
        const statusMessages: Record<string, { subject: string; heading: string; body: string }> = {
            PROCESSING: {
                subject: 'Your order is being processed',
                heading: '📦 Order is Processing',
                body: 'Great news! Your order has been confirmed and our team is now processing it.',
            },
            SHIPPING: {
                subject: 'Your order is on the way!',
                heading: '🚚 Order Shipped!',
                body: 'Your order is on its way to you. We will notify you once it arrives.',
            },
            DELIVERED: {
                subject: 'Your order has been delivered',
                heading: '✅ Order Delivered',
                body: 'Your order has been delivered. We hope you love it! Please contact us if there are any issues.',
            },
            COMPLETED: {
                subject: 'Thank you for your purchase!',
                heading: '⭐ Order Completed',
                body: 'Your order is now complete. Thank you for choosing us! We hope to see you again.',
            },
        };

        const message = statusMessages[newStatus];
        if (!message) return; // Không gửi email cho các trạng thái không cần thiết

        const { id, shippingName, totalAmount } = order;

        const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
      <h2 style="color:#5c0a1a">${message.heading}</h2>
      <p>Hi <strong>${shippingName}</strong>,</p>
      <p>${message.body}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9f5f0;border-radius:4px">
        <tr>
          <td style="padding:10px 16px;color:#888">Order ID</td>
          <td style="padding:10px 16px;font-weight:bold">#${id.slice(0, 8).toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;color:#888">Status</td>
          <td style="padding:10px 16px;font-weight:bold;color:#5c0a1a">${newStatus.replace(/_/g, ' ')}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;color:#888">Total</td>
          <td style="padding:10px 16px">$${Number(totalAmount).toFixed(2)} CAD</td>
        </tr>
      </table>
      <p>
        <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/orders/${id}"
           style="background:#5c0a1a;color:white;padding:10px 20px;text-decoration:none;border-radius:4px">
          View Order
        </a>
      </p>
    </div>
  `;

        try {
            const { data: d3, error: e3 } = await this.resend.emails.send({
                from: 'onboarding@resend.dev',
                to: order.user.email,
                subject: message.subject,
                html,
            });
            if (e3) {
                this.logger.error(`Failed to send status update to ${order.user.email}: ${JSON.stringify(e3)}`);
            } else {
                this.logger.log(`Status update email sent to ${order.user.email} — status: ${newStatus}, id: ${d3?.id}`);
            }
        } catch (err) {
            this.logger.error(`Failed to send status update email: ${String(err)}`);
        }
    }

}