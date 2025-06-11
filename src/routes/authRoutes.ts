import { globalOasTlmConfig } from '../config.js';
import { Router } from 'express';
import { serialize } from 'cookie';
import ui from '../services/uiService.js';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/login', (req, res) => {
    try {
        const { password } = req.body;
        if (password === globalOasTlmConfig.password) {
            let options = {
                maxAge: globalOasTlmConfig.apiKeyMaxAge,
                httpOnly: true, // The cookie only accessible by the web server
                secure: true, // Only sends cookie over https
                signed: false // Indicates if the cookie should be signed
            }
            const apiKey = jwt.sign({ password: globalOasTlmConfig.password }, globalOasTlmConfig.jwtSecret);
            res.cookie('apiKey', apiKey, options);
            return res.status(200).json({ valid: true, message: 'API Key is valid' });
        }
        res.status(400).json({ valid: false, message: 'Invalid API Key' });

    } catch (error) {
        console.log("Error: ", error);
        res.status(500).json({ valid: false, message: 'Internal server error' });
    }
});

router.get('/logout', (req, res) => {
    res.clearCookie('apiKey');
    res.redirect(globalOasTlmConfig.baseURL + '/login');
});

//check is used in the UI (http polling) to validate the Cookies to redirect to the login page if needed
router.get('/check', (req, res) => {
    if (!req.cookies.apiKey) {
        return res.status(200).json({ valid: false, message: 'API Key is invalid' });
    }
    const decoded = jwt.verify(req.cookies.apiKey, globalOasTlmConfig.jwtSecret);
    if (decoded.password === globalOasTlmConfig.password) {
        return res.status(200).json({ valid: true, message: 'API Key is valid' });
    }
    res.status(200).json({ valid: false, message: 'Invalid API Key' });
});

router.get('/login', (req, res) => {
    const baseURL = globalOasTlmConfig.baseURL;
    res.send(ui(baseURL).login);
});

export default router;
