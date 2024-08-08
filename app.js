const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const upload = multer(); 

const TURNSTILE_SECRET_KEY = '0x4AAAAAAAgsxks-tlZHXetsHvJMIe_quPs';
const ZOHO_URL = 'https://crm.zoho.in/crm/WebToLeadForm';

async function verifyTurnstile(token) {
    try {
        const response = await axios.post(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            new URLSearchParams({
                secret: TURNSTILE_SECRET_KEY,
                response: token
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        return response.data.success;
    } catch (error) {
        console.error('Error verifying Cloudflare Turnstile:', error);
        throw new Error('Cloudflare Turnstile verification failed');
    }
}

app.post('/submit-form', upload.none(), async (req, res) => {
    const captchaResponse = req.body['cf-turnstile-response'];
    const formData = { ...req.body };
   
    try {
        console.log('Received form data:', formData);
        console.log('Received Turnstile response:', captchaResponse);

        const isCaptchaValid = await verifyTurnstile(captchaResponse);

        if (!isCaptchaValid) {
            console.log('Invalid Cloudflare Turnstile response');
            return res.status(400).json({ error: 'Invalid Cloudflare Turnstile response. Please try again.' });
        }

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            data.append(key, formData[key]);
        });

        console.log('Submitting form data to Zoho:', formData);

        const response = await axios.post(ZOHO_URL, data, {
            headers: data.getHeaders(),
        });

        if (response.status === 200) {
            console.log('Form submitted successfully');
            return res.json({ message: 'Form submitted successfully.' });
        } else {
            console.log('Failed to submit form to Zoho CRM. Status:', response.status);
            return res.status(500).json({ error: 'Failed to submit form to Zoho CRM.' });
        }
    } catch (error) {
        console.error('Error in form submission:', error);
        return res.status(500).json({ error: 'An error occurred while processing the request.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
