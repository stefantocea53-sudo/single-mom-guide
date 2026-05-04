require("dotenv").config();

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

const PAYPAL_MODE = process.env.PAYPAL_MODE || "sandbox";

const PAYPAL_BASE_URL =
    PAYPAL_MODE === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

const PRODUCT_NAME = process.env.PRODUCT_NAME || "Strong Single Mom Guide PDF";
const PRODUCT_PRICE = process.env.PRODUCT_PRICE || "9.99";
const PRODUCT_CURRENCY = process.env.PRODUCT_CURRENCY || "USD";
const PDF_PATH = path.join(__dirname, process.env.PDF_PATH || "private/strong-single-mom-guide.pdf");

const paidOrders = new Set();

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getPayPalAccessToken() {
    const auth = Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("PayPal token error:", data);
        throw new Error("Could not get PayPal access token.");
    }

    return data.access_token;
}

async function createPayPalOrder(customerEmail) {
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [
                {
                    description: PRODUCT_NAME,
                    custom_id: customerEmail,
                    amount: {
                        currency_code: PRODUCT_CURRENCY,
                        value: PRODUCT_PRICE
                    }
                }
            ]
        })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("Create order error:", data);
        throw new Error("Could not create PayPal order.");
    }

    return data;
}

async function capturePayPalOrder(orderID) {
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        }
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("Capture order error:", data);
        throw new Error("Could not capture PayPal order.");
    }

    return data;
}

function getCaptureStatus(captureData) {
    try {
        return captureData.purchase_units[0].payments.captures[0].status;
    } catch (error) {
        return null;
    }
}

function getCaptureId(captureData) {
    try {
        return captureData.purchase_units[0].payments.captures[0].id;
    } catch (error) {
        return null;
    }
}

function getPaidAmount(captureData) {
    try {
        return captureData.purchase_units[0].payments.captures[0].amount.value;
    } catch (error) {
        return null;
    }
}

function getPaidCurrency(captureData) {
    try {
        return captureData.purchase_units[0].payments.captures[0].amount.currency_code;
    } catch (error) {
        return null;
    }
}

async function sendPdfEmail(customerEmail, orderID) {
    if (!fs.existsSync(PDF_PATH)) {
        throw new Error("PDF file does not exist. Check private/strong-single-mom-guide.pdf");
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    const mailOptions = {
        from: `"${process.env.SITE_NAME}" <${process.env.SMTP_USER}>`,
        to: customerEmail,
        bcc: process.env.SELLER_EMAIL,
        subject: `Your ${PRODUCT_NAME} is ready`,
        html: `
            <div style="font-family: Arial, sans-serif; color: #2d2524; line-height: 1.6;">
                <h2>Thank you for your purchase!</h2>

                <p>Hello,</p>

                <p>
                    Thank you for buying <strong>${PRODUCT_NAME}</strong>.
                    Your digital PDF is attached to this email.
                </p>

                <p>
                    Order ID: <strong>${orderID}</strong>
                </p>

                <p>
                    Please download and save the PDF on your device.
                </p>

                <p style="font-size: 13px; color: #777;">
                    This digital product is for educational and motivational purposes only.
                    It does not replace professional medical, legal, financial, or psychological advice.
                </p>

                <p>
                    With kindness,<br>
                    <strong>${process.env.SITE_NAME}</strong>
                </p>
            </div>
        `,
        attachments: [
            {
                filename: "strong-single-mom-guide.pdf",
                path: PDF_PATH
            }
        ]
    };

    await transporter.sendMail(mailOptions);
}

app.post("/api/create-order", async (req, res) => {
    try {
        const { email, acceptedTerms } = req.body;

        if (!email || !isValidEmail(email)) {
            return res.status(400).json({
                error: "Please enter a valid email address."
            });
        }

        if (!acceptedTerms) {
            return res.status(400).json({
                error: "You must accept the Terms, Privacy Policy, Refund Policy, and Disclaimer before buying."
            });
        }

        const order = await createPayPalOrder(email);

        res.json({
            id: order.id
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Could not create PayPal order."
        });
    }
});

app.post("/api/capture-order", async (req, res) => {
    try {
        const { orderID, email } = req.body;

        if (!orderID) {
            return res.status(400).json({
                error: "Missing PayPal order ID."
            });
        }

        if (!email || !isValidEmail(email)) {
            return res.status(400).json({
                error: "Missing or invalid customer email."
            });
        }

        if (paidOrders.has(orderID)) {
            return res.json({
                success: true,
                message: "This order was already processed."
            });
        }

        const captureData = await capturePayPalOrder(orderID);

        const status = getCaptureStatus(captureData);
        const captureId = getCaptureId(captureData);
        const paidAmount = getPaidAmount(captureData);
        const paidCurrency = getPaidCurrency(captureData);

        if (status !== "COMPLETED") {
            return res.status(400).json({
                error: "Payment was not completed."
            });
        }

        if (paidAmount !== PRODUCT_PRICE || paidCurrency !== PRODUCT_CURRENCY) {
            return res.status(400).json({
                error: "Payment amount or currency does not match the product price."
            });
        }

        await sendPdfEmail(email, orderID);

        paidOrders.add(orderID);

        res.json({
            success: true,
            orderID: orderID,
            captureId: captureId,
            message: "Payment completed. The PDF was sent to your email."
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Payment was captured or attempted, but the PDF email could not be sent. Please contact support."
        });
    }
});

app.post("/api/contact", async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message || !isValidEmail(email)) {
            return res.status(400).json({
                error: "Please complete all contact fields correctly."
            });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        await transporter.sendMail({
            from: `"Website Contact" <${process.env.SMTP_USER}>`,
            to: process.env.SELLER_EMAIL,
            subject: "New contact message from StrongMom Guide",
            html: `
                <h2>New contact message</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            `
        });

        res.json({
            success: true,
            message: "Your message was sent successfully."
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Could not send contact message."
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
