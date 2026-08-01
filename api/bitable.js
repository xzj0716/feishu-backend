// 飞书多维表格 API 代理
const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;

let cachedToken = null;
let tokenExpireTime = 0;

async function getTenantToken() {
    const now = Date.now();
    if (cachedToken && now < tokenExpireTime - 60000) {
        return cachedToken;
    }

    const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            app_id: APP_ID,
            app_secret: APP_SECRET,
        }),
    });

    const data = await res.json();
    if (data.code !== 0) {
        throw new Error('获取飞书token失败: ' + data.msg);
    }

    cachedToken = data.tenant_access_token;
    tokenExpireTime = now + data.expire * 1000;
    return cachedToken;
}

export default async function handler(req, res) {
    // CORS 跨域
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { path, method = 'GET', data } = req.body;

        if (!path) {
            res.status(400).json({ error: '缺少path参数' });
            return;
        }

        const token = await getTenantToken();
        const url = `https://open.feishu.cn/open-apis/${path}`;

        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const result = await response.json();

        res.status(200).json(result);
    } catch (error) {
        console.error('飞书API调用失败:', error);
        res.status(500).json({ error: error.message });
    }
}