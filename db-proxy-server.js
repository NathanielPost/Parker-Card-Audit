// db-proxy-server.js (runs on your company network)
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS for Render
app.use(cors({
    origin: ['https://parkerauditbackend.onrender.com', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Your existing SQL Server config (this works since it's on company network)
const config = {
    server: 'lazdatawarehouse01.lazparking.com',
    database: 'Subscription',
    user: 'subscription_writer',
    password: 'ar[xN7GOq891+krl1',
    options: {
        encrypt: false,
        enableArithAbort: true,
        trustServerCertificate: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Database proxy is running', timestamp: new Date().toISOString() });
});

// All your existing database routes (move them here exactly as they are)
app.get('/api/database/schema', async (req, res) => {
    console.log('📨 Schema endpoint hit in proxy!');
    try {
        console.log('🔗 Attempting to connect to database...');
        await sql.connect(config);
        console.log('✅ Connected to database successfully');

        const tablesResult = await sql.query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
        `);

        const tableNames = tablesResult.recordset.map(row => row.TABLE_NAME);
        const allSchemas = {};

        for (const tableName of tableNames) {
            const columnsResult = await sql.query(`
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = '${tableName}'
            `);
            allSchemas[tableName] = columnsResult.recordset;
        }

        res.json({ schema: allSchemas });
    } catch (err) {
        console.error('💥 Connection failed:', err.message);
        res.status(500).json({ 
            error: 'Database connection failed', 
            details: err.message,
            code: err.code 
        });
    } finally {
        await sql.close();
    }
});

app.get('/api/database/accessIds_for_location', async (req, res) => {
    const locationCode = req.query.locationCode;
    console.log(`🔍 Proxy: Starting with locationCode: ${locationCode}`);

    try {
        await sql.connect(config);
        const request = new sql.Request();
        request.input('locationCode', sql.Int, parseInt(locationCode, 10));

        // Your existing query logic here - copy it exactly from your current file
        let LocationId = await request.query(`
            SELECT LOCATION_ID FROM Parcs_Locations
            WHERE LOCATION_CODE IS NOT NULL
            AND LOCATION_CODE != 'undefined'
            AND LOCATION_CODE != 'null' 
            AND LOCATION_CODE != ''
            AND TRY_CAST(LOCATION_CODE AS INT) IS NOT NULL
            AND LOCATION_CODE = @locationCode
        `);

        if (!LocationId.recordset[0]?.LOCATION_ID) {
            return res.status(404).json({ message: 'Location not found' });
        }

        const locationPlatformId = LocationId.recordset[0].LOCATION_ID;

        let subId = await sql.query(`
            SELECT id FROM Subscriptions
            WHERE locationPlatformId = '${locationPlatformId}'
        `);

        if (subId.recordset.length === 0) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        const subscriptionIds = subId.recordset.map(s => s.id);

        let members = await sql.query(`
            SELECT id, firstName, lastName, email FROM Members
            WHERE subscriptionId IN (${subscriptionIds.join(', ')})
        `);

        if (members.recordset.length === 0) {
            return res.status(404).json({ message: 'Members not found' });
        }

        const memberIds = members.recordset.map(m => m.id);
        
        // Store contact info
        const contactInfo = members.recordset.map(m => ({
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
            email: m.email
        }));

        let accessIds = await sql.query(`
            SELECT DISTINCT accessId FROM Tokens
            WHERE memberId IN (${memberIds.join(', ')})
            AND accessId IS NOT NULL
            AND accessId != 'undefined'
            AND accessId != 'null'
            AND accessId != ''
            ORDER BY accessId
        `);

        res.json({
            message: 'Success! All queries completed',
            accessIds: accessIds.recordset.map(a => String(a.accessId)),
            contactInfo: contactInfo
        });

    } catch (error) {
        console.error(`💥 PROXY ERROR:`, error.message);
        res.status(500).json({
            error: 'Database query failed',
            details: error.message
        });
    } finally {
        await sql.close();
    }
});


app.get('/api/database/tokens', async (req, res) => {
    try {
        await sql.connect(config);
        const tokens = await sql.query(`SELECT TOP 100 * FROM Tokens`);
        res.json({
            message: 'Tokens data retrieved successfully',
            data: tokens.recordset
        });
    } catch (error) {
        console.error('❌ Error retrieving tokens:', error);
        res.status(500).json({ error: 'Failed to retrieve tokens', details: error.message });
    } finally {
        await sql.close();
    }
});

app.get('/api/database/locations', async (req, res) => {
    try {
        await sql.connect(config);
        const locations = await sql.query(`
            SELECT LOCATION_CODE, LOCATION_ID, COUNT(*) as count
            FROM Parcs_Locations 
            WHERE LOCATION_CODE IS NOT NULL
            AND TRY_CAST(LOCATION_CODE AS INT) IS NOT NULL
            GROUP BY LOCATION_CODE, LOCATION_ID
            ORDER BY count DESC
        `);
        res.json({
            message: 'Locations data retrieved successfully',
            data: locations.recordset
        });
    } catch (error) {
        console.error('❌ Error retrieving locations:', error);
        res.status(500).json({ error: 'Failed to retrieve locations', details: error.message });
    } finally {
        await sql.close();
    }
});

app.get('/api/database/members', async (req, res) => {
    try {
        await sql.connect(config);
        const members = await sql.query(`
            SELECT TOP 100 * FROM Members
            WHERE firstName IS NOT NULL AND lastName IS NOT NULL
            AND subscriptionId LIKE '1229388'
            ORDER BY id
        `);
        res.json({
            message: 'Members data retrieved successfully',
            data: members.recordset
        });
    } catch (error) {
        console.error('❌ Error retrieving members:', error);
        res.status(500).json({ error: 'Failed to retrieve members', details: error.message });
    } finally {
        await sql.close();
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Database proxy server running on port ${PORT}`);
    console.log(`🔗 Ready to forward requests to SQL Server`);
});