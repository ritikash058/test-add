const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files from public folder

// Serve the HTML form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Generate unique transaction ID
function generateTransactionId() {
    return 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// HMAC SHA256 function
function generateHmacSha256Hash(data, secret) {
    if (!data || !secret) {
        throw new Error("Both data and secret are required to generate a hash.");
    }

    const hash = crypto
        .createHmac("sha256", secret)
        .update(data)
        .digest("base64");

    return hash;
}

// Prepare eSewa payment data
function prepareEsewaPayment(amount, taxAmount = 0, transactionId, productCode = 'EPAYTEST') {
    const totalAmount = (parseFloat(amount) + parseFloat(taxAmount)).toString();
    
    const paymentData = {
        amount: amount.toString(),
        tax_amount: taxAmount.toString(),
        total_amount: totalAmount,
        transaction_uuid: transactionId,
        product_code: productCode,
        product_service_charge: "0",
        product_delivery_charge: "0",
        success_url: `http://localhost:${PORT}/success`,
        failure_url: `http://localhost:${PORT}/failure`,
        signed_field_names: "total_amount,transaction_uuid,product_code"
    };

    // Create the data string for signature
    const signatureData = `total_amount=${paymentData.total_amount},transaction_uuid=${paymentData.transaction_uuid},product_code=${paymentData.product_code}`;
    
    // Generate signature
    const secretKey = '8gBm/:&EnhH.1/q';
    const signature = generateHmacSha256Hash(signatureData, secretKey);
    
    paymentData.signature = signature;
    
    return paymentData;
}

// API endpoint to initiate payment
app.post('/initiate-payment', (req, res) => {
    try {
        const { amount = '100', taxAmount = '10' } = req.body;
        
        const transactionId = generateTransactionId();
        const paymentData = prepareEsewaPayment(amount, taxAmount, transactionId);
        console.log(transactionId,"ff")
        res.json({
            success: true,
            message: 'Payment initiated successfully',
            data: paymentData
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error initiating payment',
            error: error.message
        });
    }
});

// Success page
app.get('/success', (req, res) => {
    res.send(`
        <html>
            <head><title>Payment Success</title></head>
            <body>
                <h1>Payment Successful! ✅</h1>
                <p>Your payment was processed successfully.</p>
                <a href="/">Back to Home</a>
            </body>
        </html>
    `);
});

// Failure page
app.get('/failure', (req, res) => {
    res.send(`
        <html>
            <head><title>Payment Failed</title></head>
            <body>
                <h1>Payment Failed! ❌</h1>
                <p>There was an issue processing your payment.</p>
                <a href="/">Try Again</a>
            </body>
        </html>
    `);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📧 eSewa test environment is ready!`);
});