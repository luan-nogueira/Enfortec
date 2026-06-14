import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || "587");
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || `"Eforte Games" <no-reply@efortegames.com.br>`;

export async function sendDeliveryEmail({
  to,
  buyerName,
  productName,
  deliveryDetails,
}: {
  to: string;
  buyerName: string;
  productName: string;
  deliveryDetails: string;
}) {
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn("[Email] SMTP is not configured. Skipping sending email to:", to);
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const messageText = `Olá, ${buyerName}!

Obrigado por adquirir o jogo ${productName}!

Aqui estão as instruções e dados de acesso para começar a jogar:

--------------------------------------------------
${deliveryDetails}
--------------------------------------------------

Qualquer dúvida ou problema, nossa equipe estará totalmente à disposição para lhe ajudar!
Você pode entrar em contato conosco diretamente pelo chat do site ou pelo nosso WhatsApp: +55 43 8425-3691.

Atenciosamente,
Equipe Eforte Games`;

  const messageHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #dc143c; margin-top: 0;">Obrigado pela sua compra!</h2>
      <p>Olá, <strong>${buyerName}</strong>,</p>
      <p>Agradecemos por adquirir o jogo <strong>${productName}</strong> na Eforte Games.</p>
      
      <div style="background-color: #f9f9f9; border-left: 4px solid #dc143c; padding: 15px; margin: 20px 0; font-family: monospace; white-space: pre-wrap;">
        <h3 style="margin-top: 0; color: #333;">🗝️ Dados de Acesso / Instruções:</h3>
        ${deliveryDetails.replace(/\n/g, "<br>")}
      </div>
      
      <p>Qualquer dúvida ou problema, estamos à total disposição para ajudar no que for preciso.</p>
      <p>Você pode entrar em contato conosco pelo chat em nosso site ou diretamente através do nosso <strong>WhatsApp: +55 43 8425-3691</strong>.</p>
      
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">
      <p style="font-size: 12px; color: #777777; text-align: center;">Eforte Games — Diversão garantida no seu console</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: smtpFrom,
      to,
      subject: `🗝️ Seu jogo ${productName} chegou! - Eforte Games`,
      text: messageText,
      html: messageHtml,
    });

    console.log("[Email] Email de entrega enviado com sucesso:", info.messageId);
    return true;
  } catch (error) {
    console.error("[Email] Erro ao enviar email:", error);
    throw error;
  }
}
